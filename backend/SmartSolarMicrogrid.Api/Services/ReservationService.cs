/*
 * Energy Reservation Management
 * Applies reservation ownership and business rules and coordinates MongoDB persistence.
 */
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class ReservationService
{
    private const string SlotCollectionName = "EnergyBookingSlots";
    private const string SlotAvailable = "Available";
    private const string SlotReserved = "Reserved";

    private readonly IMongoCollection<Reservation> _reservations;
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<BsonDocument> _slots;
    private readonly TimeProvider _timeProvider;

    public ReservationService(IMongoDatabase database, TimeProvider timeProvider)
    {
        // Bind only to the agreed collections and retain an injectable clock for boundary tests.
        _reservations = database.GetCollection<Reservation>("Reservations");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _slots = database.GetCollection<BsonDocument>(SlotCollectionName);
        _timeProvider = timeProvider;
    }

    public async Task EnsureIndexesAsync(CancellationToken cancellationToken = default)
    {
        // Prevent more than one live Pending or Approved reservation from referencing a slot.
        var activeStatuses = new BsonArray { ReservationStatuses.Pending, ReservationStatuses.Approved };
        var partialFilter = new BsonDocument("Status", new BsonDocument("$in", activeStatuses));
        var model = new CreateIndexModel<Reservation>(
            Builders<Reservation>.IndexKeys.Ascending(reservation => reservation.BookingSlotId),
            new CreateIndexOptions<Reservation>
            {
                Name = "unique_active_reservation_per_slot",
                Unique = true,
                PartialFilterExpression = new BsonDocumentFilterDefinition<Reservation>(partialFilter)
            });

        await _reservations.Indexes.CreateOneAsync(model, cancellationToken: cancellationToken);
    }

    public async Task<ReservationResult> CreateAsync(
        string prosumerId,
        CreateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        // Validate request-owned values before accessing dependent node and slot records.
        var inputError = ValidateInput(request.MicrogridNodeId, request.BookingSlotId, request.EnergyAmountKwh);
        if (inputError is not null)
        {
            return ReservationResult.Invalid(inputError);
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var dependency = await ValidateDependenciesAsync(
            request.MicrogridNodeId.Trim(), request.BookingSlotId.Trim(), now, false, cancellationToken);
        if (!dependency.IsValid)
        {
            return dependency.Failure!;
        }

        var reservation = new Reservation
        {
            Id = ObjectId.GenerateNewId().ToString(),
            ProsumerId = prosumerId,
            MicrogridNodeId = request.MicrogridNodeId.Trim(),
            BookingSlotId = request.BookingSlotId.Trim(),
            ScheduledStartUtc = dependency.ScheduledStartUtc,
            EnergyAmountKwh = request.EnergyAmountKwh,
            Status = ReservationStatuses.Pending,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        if (!await TryReserveSlotAsync(reservation.BookingSlotId, reservation.MicrogridNodeId, cancellationToken))
        {
            return ReservationResult.Conflict("The selected booking slot is no longer available.");
        }

        try
        {
            await _reservations.InsertOneAsync(reservation, cancellationToken: cancellationToken);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            await TryReleaseSlotAsync(reservation.BookingSlotId, reservation.MicrogridNodeId, cancellationToken);
            return ReservationResult.Conflict("The selected booking slot already has an active reservation.");
        }
        catch
        {
            await TryReleaseSlotAsync(reservation.BookingSlotId, reservation.MicrogridNodeId, cancellationToken);
            throw;
        }

        return ReservationResult.Success(ToResponse(reservation));
    }

    public async Task<ReservationResult> GetByIdAsync(
        string reservationId,
        string prosumerId,
        CancellationToken cancellationToken = default)
    {
        // Include the authenticated owner in the query to prevent cross-account disclosure.
        var reservation = await _reservations
            .Find(item => item.Id == reservationId && item.ProsumerId == prosumerId)
            .FirstOrDefaultAsync(cancellationToken);

        return reservation is null
            ? ReservationResult.NotFound("Reservation was not found.")
            : ReservationResult.Success(ToResponse(reservation));
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetAllByProsumerAsync(
        string prosumerId,
        CancellationToken cancellationToken = default)
    {
        // Return only the authenticated Prosumer's reservations, newest first.
        var reservations = await _reservations
            .Find(item => item.ProsumerId == prosumerId)
            .SortByDescending(item => item.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return reservations.Select(ToResponse).ToList();
    }

    public async Task<ReservationResult> UpdateAsync(
        string reservationId,
        string prosumerId,
        UpdateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        // Load only the authenticated owner's reservation before applying mutation rules.
        var reservation = await _reservations
            .Find(item => item.Id == reservationId && item.ProsumerId == prosumerId)
            .FirstOrDefaultAsync(cancellationToken);
        if (reservation is null)
        {
            return ReservationResult.NotFound("Reservation was not found.");
        }

        if (reservation.Status is ReservationStatuses.Cancelled or ReservationStatuses.Completed)
        {
            return ReservationResult.Invalid($"A {reservation.Status} reservation cannot be modified.");
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noticeError = ReservationRules.ValidateModificationWindow(reservation.ScheduledStartUtc, now, "modified");
        if (noticeError is not null)
        {
            return ReservationResult.Invalid(noticeError);
        }

        var inputError = ValidateInput(request.MicrogridNodeId, request.BookingSlotId, request.EnergyAmountKwh);
        if (inputError is not null)
        {
            return ReservationResult.Invalid(inputError);
        }

        var nodeId = request.MicrogridNodeId.Trim();
        var slotId = request.BookingSlotId.Trim();
        var slotChanged = reservation.BookingSlotId != slotId || reservation.MicrogridNodeId != nodeId;
        var dependency = await ValidateDependenciesAsync(nodeId, slotId, now, !slotChanged, cancellationToken);
        if (!dependency.IsValid)
        {
            return dependency.Failure!;
        }

        if (slotChanged && !await TryReserveSlotAsync(slotId, nodeId, cancellationToken))
        {
            return ReservationResult.Conflict("The selected booking slot is no longer available.");
        }

        var previousNodeId = reservation.MicrogridNodeId;
        var previousSlotId = reservation.BookingSlotId;
        var update = Builders<Reservation>.Update
            .Set(item => item.MicrogridNodeId, nodeId)
            .Set(item => item.BookingSlotId, slotId)
            .Set(item => item.ScheduledStartUtc, dependency.ScheduledStartUtc)
            .Set(item => item.EnergyAmountKwh, request.EnergyAmountKwh)
            .Set(item => item.UpdatedAtUtc, now);
        var filter = Builders<Reservation>.Filter.Where(item =>
            item.Id == reservationId &&
            item.ProsumerId == prosumerId &&
            item.UpdatedAtUtc == reservation.UpdatedAtUtc &&
            item.Status != ReservationStatuses.Cancelled &&
            item.Status != ReservationStatuses.Completed);
        var updated = await _reservations.FindOneAndUpdateAsync(
            filter,
            update,
            new FindOneAndUpdateOptions<Reservation> { ReturnDocument = ReturnDocument.After },
            cancellationToken);

        if (updated is null)
        {
            if (slotChanged)
            {
                await TryReleaseSlotAsync(slotId, nodeId, cancellationToken);
            }
            return ReservationResult.Conflict("The reservation changed while it was being updated. Reload it and try again.");
        }

        if (slotChanged && !await TryReleaseSlotAsync(previousSlotId, previousNodeId, cancellationToken))
        {
            return ReservationResult.Conflict("The reservation was updated, but its previous slot could not be released. Contact an operator.");
        }

        return ReservationResult.Success(ToResponse(updated));
    }

    public async Task<ReservationResult> CancelAsync(
        string reservationId,
        string prosumerId,
        CancellationToken cancellationToken = default)
    {
        // Load only the authenticated owner's reservation before checking cancellation rules.
        var reservation = await _reservations
            .Find(item => item.Id == reservationId && item.ProsumerId == prosumerId)
            .FirstOrDefaultAsync(cancellationToken);
        if (reservation is null)
        {
            return ReservationResult.NotFound("Reservation was not found.");
        }

        if (reservation.Status is ReservationStatuses.Cancelled or ReservationStatuses.Completed)
        {
            return ReservationResult.Invalid($"A {reservation.Status} reservation cannot be cancelled.");
        }

        var now = _timeProvider.GetUtcNow().UtcDateTime;
        var noticeError = ReservationRules.ValidateModificationWindow(reservation.ScheduledStartUtc, now, "cancelled");
        if (noticeError is not null)
        {
            return ReservationResult.Invalid(noticeError);
        }

        var filter = Builders<Reservation>.Filter.Where(item =>
            item.Id == reservationId &&
            item.ProsumerId == prosumerId &&
            item.UpdatedAtUtc == reservation.UpdatedAtUtc &&
            item.Status != ReservationStatuses.Cancelled &&
            item.Status != ReservationStatuses.Completed);
        var update = Builders<Reservation>.Update
            .Set(item => item.Status, ReservationStatuses.Cancelled)
            .Set(item => item.CancelledAtUtc, now)
            .Set(item => item.UpdatedAtUtc, now);
        var cancelled = await _reservations.FindOneAndUpdateAsync(
            filter,
            update,
            new FindOneAndUpdateOptions<Reservation> { ReturnDocument = ReturnDocument.After },
            cancellationToken);

        if (cancelled is null)
        {
            return ReservationResult.Conflict("The reservation changed while it was being cancelled. Reload it and try again.");
        }

        if (!await TryReleaseSlotAsync(cancelled.BookingSlotId, cancelled.MicrogridNodeId, cancellationToken))
        {
            return ReservationResult.Conflict("The reservation was cancelled, but its booking slot could not be released. Contact an operator.");
        }

        return ReservationResult.Success(ToResponse(cancelled));
    }

    private static string? ValidateInput(string? nodeId, string? slotId, decimal energyAmountKwh)
    {
        // Reject missing identifiers and non-positive energy values with stable API messages.
        if (string.IsNullOrWhiteSpace(nodeId) || string.IsNullOrWhiteSpace(slotId))
        {
            return "Microgrid node and booking slot are required.";
        }

        return ReservationRules.ValidateEnergyAmount(energyAmountKwh);
    }

    private async Task<DependencyValidation> ValidateDependenciesAsync(
        string nodeId,
        string slotId,
        DateTime utcNow,
        bool allowReservedSlot,
        CancellationToken cancellationToken)
    {
        // Validate node ownership, slot availability, and the server-derived UTC schedule.
        var node = await _nodes.Find(item => item.Id == nodeId).FirstOrDefaultAsync(cancellationToken);
        if (node is null)
        {
            return DependencyValidation.Fail(ReservationResult.NotFound("Microgrid node was not found."));
        }
        if (!node.IsActive)
        {
            return DependencyValidation.Fail(ReservationResult.Invalid("The selected microgrid node is inactive."));
        }

        var slot = await _slots.Find(Builders<BsonDocument>.Filter.Eq("_id", slotId))
            .FirstOrDefaultAsync(cancellationToken);
        if (slot is null)
        {
            return DependencyValidation.Fail(ReservationResult.NotFound("Booking slot was not found."));
        }

        if (!TryGetString(slot, "NodeId", out var slotNodeId) || slotNodeId != nodeId)
        {
            return DependencyValidation.Fail(ReservationResult.Invalid("The selected booking slot does not belong to the selected microgrid node."));
        }
        if (!TryGetBoolean(slot, "IsActive", out var isActive) || !isActive)
        {
            return DependencyValidation.Fail(ReservationResult.Invalid("The selected booking slot is inactive."));
        }
        if (!TryGetString(slot, "Status", out var status) ||
            status != SlotAvailable && !(allowReservedSlot && status == SlotReserved))
        {
            return DependencyValidation.Fail(ReservationResult.Conflict("The selected booking slot is not available."));
        }
        if (!TryGetUtcDateTime(slot, "StartTime", out var scheduledStartUtc))
        {
            return DependencyValidation.Fail(ReservationResult.Invalid("The selected booking slot has an invalid start time."));
        }

        var scheduleError = ReservationRules.ValidateScheduledStart(scheduledStartUtc, utcNow);
        return scheduleError is null
            ? DependencyValidation.Valid(scheduledStartUtc)
            : DependencyValidation.Fail(ReservationResult.Invalid(scheduleError));
    }

    private async Task<bool> TryReserveSlotAsync(string slotId, string nodeId, CancellationToken cancellationToken)
    {
        // Atomically claim only an active, available slot belonging to the selected node.
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("_id", slotId),
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("IsActive", true),
            Builders<BsonDocument>.Filter.Eq("Status", SlotAvailable));
        var update = Builders<BsonDocument>.Update
            .Set("Status", SlotReserved)
            .Set("UpdatedAt", _timeProvider.GetUtcNow().UtcDateTime);
        var result = await _slots.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount == 1;
    }

    private async Task<bool> TryReleaseSlotAsync(string slotId, string nodeId, CancellationToken cancellationToken)
    {
        // Atomically return the reservation's slot to the available state.
        var filter = Builders<BsonDocument>.Filter.And(
            Builders<BsonDocument>.Filter.Eq("_id", slotId),
            Builders<BsonDocument>.Filter.Eq("NodeId", nodeId),
            Builders<BsonDocument>.Filter.Eq("Status", SlotReserved));
        var update = Builders<BsonDocument>.Update
            .Set("Status", SlotAvailable)
            .Set("UpdatedAt", _timeProvider.GetUtcNow().UtcDateTime);
        var result = await _slots.UpdateOneAsync(filter, update, cancellationToken: cancellationToken);
        return result.ModifiedCount == 1;
    }

    private static bool TryGetString(BsonDocument document, string name, out string value)
    {
        // Read a required string field without allowing malformed shared slot data to throw.
        value = string.Empty;
        return document.TryGetValue(name, out var item) && item.IsString &&
               !string.IsNullOrWhiteSpace(value = item.AsString);
    }

    private static bool TryGetBoolean(BsonDocument document, string name, out bool value)
    {
        // Read a required Boolean field without assuming the slot document is complete.
        value = false;
        if (!document.TryGetValue(name, out var item) || !item.IsBoolean)
        {
            return false;
        }

        value = item.AsBoolean;
        return true;
    }

    private static bool TryGetUtcDateTime(BsonDocument document, string name, out DateTime value)
    {
        // Read a BSON date and normalize it to UTC for all reservation calculations.
        value = default;
        if (!document.TryGetValue(name, out var item) || item.BsonType != BsonType.DateTime)
        {
            return false;
        }

        value = item.AsBsonDateTime.ToUniversalTime();
        return true;
    }

    private static ReservationResponse ToResponse(Reservation reservation)
    {
        // Map persistence data to the public reservation summary without leaking internals.
        return new ReservationResponse
        {
            Id = reservation.Id,
            ProsumerId = reservation.ProsumerId,
            MicrogridNodeId = reservation.MicrogridNodeId,
            BookingSlotId = reservation.BookingSlotId,
            ScheduledStartUtc = reservation.ScheduledStartUtc,
            EnergyAmountKwh = reservation.EnergyAmountKwh,
            Status = reservation.Status,
            CreatedAtUtc = reservation.CreatedAtUtc,
            UpdatedAtUtc = reservation.UpdatedAtUtc,
            CancelledAtUtc = reservation.CancelledAtUtc
        };
    }

    private sealed record DependencyValidation(bool IsValid, DateTime ScheduledStartUtc, ReservationResult? Failure)
    {
        public static DependencyValidation Valid(DateTime scheduledStartUtc)
        {
            // Return the validated server-derived schedule to the calling operation.
            return new DependencyValidation(true, scheduledStartUtc, null);
        }

        public static DependencyValidation Fail(ReservationResult failure)
        {
            // Preserve the precise dependency failure for controller status mapping.
            return new DependencyValidation(false, default, failure);
        }
    }
}

public enum ReservationFailure
{
    None,
    Invalid,
    NotFound,
    Conflict
}

public sealed class ReservationResult
{
    private ReservationResult(ReservationResponse? reservation, ReservationFailure failure, string? error)
    {
        // Store either a successful summary or a categorized application failure.
        Reservation = reservation;
        Failure = failure;
        Error = error;
    }

    public ReservationResponse? Reservation { get; }
    public ReservationFailure Failure { get; }
    public string? Error { get; }

    public static ReservationResult Success(ReservationResponse reservation)
    {
        // Construct a successful service result.
        return new ReservationResult(reservation, ReservationFailure.None, null);
    }

    public static ReservationResult Invalid(string error)
    {
        // Construct a business-validation failure.
        return new ReservationResult(null, ReservationFailure.Invalid, error);
    }

    public static ReservationResult NotFound(string error)
    {
        // Construct a resource or ownership-safe not-found failure.
        return new ReservationResult(null, ReservationFailure.NotFound, error);
    }

    public static ReservationResult Conflict(string error)
    {
        // Construct a duplicate, race, or contradictory-state failure.
        return new ReservationResult(null, ReservationFailure.Conflict, error);
    }
}
