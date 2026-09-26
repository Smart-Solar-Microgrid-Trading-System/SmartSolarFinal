/*
 * Component: Energy Reservation Management
 * File: ReservationCommandService.cs
 * Purpose: Applies reservation business rules and coordinates MongoDB create, update, and cancellation operations.
 */
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class ReservationCommandService
{
    private static readonly TimeSpan ModificationNotice = TimeSpan.FromHours(12);
    private static readonly TimeSpan MaximumAdvance = TimeSpan.FromDays(7);

    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<User> _users;

    public ReservationCommandService(IMongoDatabase database)
    {
        // Connect the service to the shared reservation, slot, node, and user collections.
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservations");
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _users = database.GetCollection<User>("Users");
    }

    public async Task<ReservationCommandResult> CreateAsync(CreateReservationRequest request)
    {
        // Validate the selected dependencies before atomically reserving a slot.
        var prosumerNic = request.ProsumerNic?.Trim();
        var nodeId = request.NodeId?.Trim();
        var slotId = request.SlotId?.Trim();
        if (string.IsNullOrWhiteSpace(prosumerNic) || string.IsNullOrWhiteSpace(nodeId) || string.IsNullOrWhiteSpace(slotId))
            return ReservationCommandResult.Invalid("Prosumer, microgrid node, and booking slot are required.");
        if (request.EnergyAmountKw <= 0)
            return ReservationCommandResult.Invalid("Energy amount must be greater than zero.");

        var prosumer = await _users.Find(user => user.Id == prosumerNic && user.Role == UserRoles.Prosumer).FirstOrDefaultAsync();
        if (prosumer is null)
            return ReservationCommandResult.NotFound("Prosumer was not found.");
        if (prosumer.AccountStatus != AccountStatuses.Active)
            return ReservationCommandResult.Invalid("Only an active Prosumer can receive a reservation.");

        var node = await _nodes.Find(item => item.Id == nodeId && item.IsActive).FirstOrDefaultAsync();
        if (node is null)
            return ReservationCommandResult.NotFound("Active microgrid node was not found.");

        var slotResult = await ValidateSlotAsync(slotId, nodeId, request.EnergyAmountKw, allowReservedSlot: false);
        if (slotResult.Error is not null)
            return slotResult.Error;

        var slot = slotResult.Slot!;
        var claimed = await _slots.UpdateOneAsync(
            item => item.Id == slot.Id && item.NodeId == nodeId && item.IsActive && item.Status == BookingSlotStatuses.Available,
            Builders<EnergyBookingSlot>.Update.Set(item => item.Status, BookingSlotStatuses.Reserved).Set(item => item.UpdatedAt, DateTime.UtcNow));
        if (claimed.ModifiedCount != 1)
            return ReservationCommandResult.Conflict("The selected booking slot is no longer available.");

        var now = DateTime.UtcNow;
        var reservation = new EnergyReservation
        {
            Id = Guid.NewGuid().ToString(),
            ProsumerNic = prosumerNic,
            NodeId = nodeId,
            SlotId = slot.Id,
            EnergyAmountKw = request.EnergyAmountKw,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            Status = ReservationStatuses.Pending,
            CreatedAt = now,
            UpdatedAt = now
        };

        try
        {
            await _reservations.InsertOneAsync(reservation);
        }
        catch
        {
            await ReleaseSlotAsync(slot.Id);
            throw;
        }

        return ReservationCommandResult.Success(reservation.Id);
    }

    public async Task<ReservationCommandResult> UpdateAsync(string id, UpdateReservationRequest request)
    {
        // Enforce status and notice rules before changing the reservation's slot or energy.
        var reservation = await _reservations.Find(item => item.Id == id).FirstOrDefaultAsync();
        if (reservation is null)
            return ReservationCommandResult.NotFound("Reservation was not found.");
        var stateError = ValidateMutable(reservation, "modified");
        if (stateError is not null)
            return stateError;
        if (string.IsNullOrWhiteSpace(request.SlotId) || request.EnergyAmountKw <= 0)
            return ReservationCommandResult.Invalid("A booking slot and positive energy amount are required.");

        var slotId = request.SlotId.Trim();
        var slotChanged = slotId != reservation.SlotId;
        var slotResult = await ValidateSlotAsync(slotId, reservation.NodeId, request.EnergyAmountKw, allowReservedSlot: !slotChanged);
        if (slotResult.Error is not null)
            return slotResult.Error;

        if (slotChanged)
        {
            var claimed = await _slots.UpdateOneAsync(
                item => item.Id == slotId && item.NodeId == reservation.NodeId && item.IsActive && item.Status == BookingSlotStatuses.Available,
                Builders<EnergyBookingSlot>.Update.Set(item => item.Status, BookingSlotStatuses.Reserved).Set(item => item.UpdatedAt, DateTime.UtcNow));
            if (claimed.ModifiedCount != 1)
                return ReservationCommandResult.Conflict("The selected booking slot is no longer available.");
        }

        var slot = slotResult.Slot!;
        var updated = await _reservations.UpdateOneAsync(
            item => item.Id == id && item.UpdatedAt == reservation.UpdatedAt,
            Builders<EnergyReservation>.Update
                .Set(item => item.SlotId, slot.Id)
                .Set(item => item.StartTime, slot.StartTime)
                .Set(item => item.EndTime, slot.EndTime)
                .Set(item => item.EnergyAmountKw, request.EnergyAmountKw)
                .Set(item => item.UpdatedAt, DateTime.UtcNow));
        if (updated.ModifiedCount != 1)
        {
            if (slotChanged) await ReleaseSlotAsync(slotId);
            return ReservationCommandResult.Conflict("The reservation changed while it was being updated. Reload and try again.");
        }

        if (slotChanged) await ReleaseSlotAsync(reservation.SlotId);
        return ReservationCommandResult.Success(id);
    }

    public async Task<ReservationCommandResult> CancelAsync(string id)
    {
        // Mark an eligible reservation as Cancelled without deleting its database record.
        var reservation = await _reservations.Find(item => item.Id == id).FirstOrDefaultAsync();
        if (reservation is null)
            return ReservationCommandResult.NotFound("Reservation was not found.");
        var stateError = ValidateMutable(reservation, "cancelled");
        if (stateError is not null)
            return stateError;

        var now = DateTime.UtcNow;
        var updated = await _reservations.UpdateOneAsync(
            item => item.Id == id && item.UpdatedAt == reservation.UpdatedAt,
            Builders<EnergyReservation>.Update
                .Set(item => item.Status, ReservationStatuses.Cancelled)
                .Set(item => item.CancelledAt, now)
                .Set(item => item.UpdatedAt, now));
        if (updated.ModifiedCount != 1)
            return ReservationCommandResult.Conflict("The reservation changed while it was being cancelled. Reload and try again.");

        await ReleaseSlotAsync(reservation.SlotId);
        return ReservationCommandResult.Success(id);
    }

    private async Task<(EnergyBookingSlot? Slot, ReservationCommandResult? Error)> ValidateSlotAsync(
        string slotId, string nodeId, decimal energyAmount, bool allowReservedSlot)
    {
        // Confirm that the requested slot belongs to the node and satisfies availability rules.
        var slot = await _slots.Find(item => item.Id == slotId && item.IsActive).FirstOrDefaultAsync();
        if (slot is null) return (null, ReservationCommandResult.NotFound("Booking slot was not found."));
        if (slot.NodeId != nodeId) return (null, ReservationCommandResult.Invalid("The booking slot does not belong to the selected microgrid node."));
        if (slot.Status != BookingSlotStatuses.Available && !(allowReservedSlot && slot.Status == BookingSlotStatuses.Reserved))
            return (null, ReservationCommandResult.Conflict("The selected booking slot is not available."));
        if (energyAmount > slot.CapacityKw)
            return (null, ReservationCommandResult.Invalid("Energy amount cannot exceed the booking slot capacity."));
        var now = DateTime.UtcNow;
        if (slot.StartTime <= now) return (null, ReservationCommandResult.Invalid("The booking slot must start in the future."));
        if (slot.StartTime > now.Add(MaximumAdvance))
            return (null, ReservationCommandResult.Invalid("The reservation cannot be scheduled more than seven days in advance."));
        return (slot, null);
    }

    private static ReservationCommandResult? ValidateMutable(EnergyReservation reservation, string action)
    {
        // Reject terminal reservations and changes attempted inside the 12-hour window.
        if (reservation.Status is ReservationStatuses.Cancelled or ReservationStatuses.Completed)
            return ReservationCommandResult.Invalid($"A {reservation.Status} reservation cannot be {action}.");
        if (reservation.StartTime - DateTime.UtcNow < ModificationNotice)
            return ReservationCommandResult.Invalid($"A reservation cannot be {action} when fewer than 12 hours remain before its scheduled start.");
        return null;
    }

    private Task ReleaseSlotAsync(string slotId)
    {
        // Return a previously reserved slot to the Available state.
        return _slots.UpdateOneAsync(
            item => item.Id == slotId && item.Status == BookingSlotStatuses.Reserved,
            Builders<EnergyBookingSlot>.Update.Set(item => item.Status, BookingSlotStatuses.Available).Set(item => item.UpdatedAt, DateTime.UtcNow));
    }
}

public enum ReservationCommandFailure { None, Invalid, NotFound, Conflict }

public sealed record ReservationCommandResult(string? ReservationId, string? Error, ReservationCommandFailure Failure)
{
    public static ReservationCommandResult Success(string id)
    {
        // Represent a completed reservation command.
        return new(id, null, ReservationCommandFailure.None);
    }

    public static ReservationCommandResult Invalid(string error)
    {
        // Represent input or business-rule validation failure.
        return new(null, error, ReservationCommandFailure.Invalid);
    }

    public static ReservationCommandResult NotFound(string error)
    {
        // Represent a missing reservation or dependency.
        return new(null, error, ReservationCommandFailure.NotFound);
    }

    public static ReservationCommandResult Conflict(string error)
    {
        // Represent a concurrency or slot-availability conflict.
        return new(null, error, ReservationCommandFailure.Conflict);
    }
}
