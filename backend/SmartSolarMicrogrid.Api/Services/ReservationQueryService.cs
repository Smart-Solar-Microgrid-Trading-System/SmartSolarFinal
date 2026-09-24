using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class ReservationQueryService
{
    private readonly IMongoCollection<Reservation> _reservations;
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<BsonDocument> _slots;

    public ReservationQueryService(IMongoDatabase database)
    {
        _reservations = database.GetCollection<Reservation>("Reservations");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _slots = database.GetCollection<BsonDocument>("EnergyBookingSlots");
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetAllAsync(
        ReservationFilterRequest request,
        string userId,
        string role)
    {
        var filter = BuildOwnerFilter(userId, role);

        if (!string.IsNullOrWhiteSpace(request.Status))
            filter &= Builders<Reservation>.Filter.Eq(item => item.Status, request.Status.Trim());
        if (!string.IsNullOrWhiteSpace(request.NodeId))
            filter &= Builders<Reservation>.Filter.Eq(item => item.MicrogridNodeId, request.NodeId.Trim());
        if (request.From.HasValue)
            filter &= Builders<Reservation>.Filter.Gte(item => item.ScheduledStartUtc, request.From.Value);
        if (request.To.HasValue)
            filter &= Builders<Reservation>.Filter.Lte(item => item.ScheduledStartUtc, request.To.Value);

        var reservations = await _reservations.Find(filter)
            .SortByDescending(item => item.CreatedAtUtc)
            .ToListAsync();

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            reservations = reservations.Where(item =>
                item.Id.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                item.ProsumerId.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                item.MicrogridNodeId.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                item.BookingSlotId.Contains(search, StringComparison.OrdinalIgnoreCase)).ToList();
        }

        return await ConvertToResponsesAsync(reservations);
    }

    public async Task<ReservationResponse?> GetByIdAsync(string id, string userId, string role)
    {
        var filter = Builders<Reservation>.Filter.Eq(item => item.Id, id) & BuildOwnerFilter(userId, role);
        var reservation = await _reservations.Find(filter).FirstOrDefaultAsync();
        return reservation is null ? null : await ConvertToResponseAsync(reservation);
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetCurrentAsync(string userId, string role)
    {
        var activeStatuses = new[] { ReservationStatuses.Pending, ReservationStatuses.Approved };
        var filter = BuildOwnerFilter(userId, role) &
            Builders<Reservation>.Filter.In(item => item.Status, activeStatuses);
        var reservations = await _reservations.Find(filter)
            .SortBy(item => item.ScheduledStartUtc)
            .ToListAsync();
        return await ConvertToResponsesAsync(reservations);
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetPendingAsync(string userId, string role)
    {
        var filter = BuildOwnerFilter(userId, role) &
            Builders<Reservation>.Filter.Eq(item => item.Status, ReservationStatuses.Pending);
        var reservations = await _reservations.Find(filter)
            .SortBy(item => item.ScheduledStartUtc)
            .ToListAsync();
        return await ConvertToResponsesAsync(reservations);
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetHistoryAsync(string userId, string role)
    {
        var historyStatuses = new[]
        {
            ReservationStatuses.Completed,
            ReservationStatuses.Cancelled,
            ReservationStatuses.Rejected
        };
        var filter = BuildOwnerFilter(userId, role) &
            Builders<Reservation>.Filter.In(item => item.Status, historyStatuses);
        var reservations = await _reservations.Find(filter)
            .SortByDescending(item => item.UpdatedAtUtc)
            .ToListAsync();
        return await ConvertToResponsesAsync(reservations);
    }

    public async Task<OperationalDashboardResponse> GetDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);
        var activeStatuses = new[] { ReservationStatuses.Pending, ReservationStatuses.Approved };

        return new OperationalDashboardResponse
        {
            PendingReservations = await _reservations.CountDocumentsAsync(item => item.Status == ReservationStatuses.Pending),
            ApprovedFutureReservations = await _reservations.CountDocumentsAsync(item =>
                item.Status == ReservationStatuses.Approved && item.ScheduledStartUtc > now),
            CurrentBookings = await _reservations.CountDocumentsAsync(
                Builders<Reservation>.Filter.In(item => item.Status, activeStatuses)),
            CompletedToday = await _reservations.CountDocumentsAsync(item =>
                item.Status == ReservationStatuses.Completed &&
                item.UpdatedAtUtc >= today && item.UpdatedAtUtc < tomorrow)
        };
    }

    private static FilterDefinition<Reservation> BuildOwnerFilter(string userId, string role)
    {
        return role == UserRoles.Prosumer
            ? Builders<Reservation>.Filter.Eq(item => item.ProsumerId, userId)
            : Builders<Reservation>.Filter.Empty;
    }

    private async Task<IReadOnlyList<ReservationResponse>> ConvertToResponsesAsync(IEnumerable<Reservation> reservations)
    {
        var result = new List<ReservationResponse>();
        foreach (var reservation in reservations)
            result.Add(await ConvertToResponseAsync(reservation));
        return result;
    }

    private async Task<ReservationResponse> ConvertToResponseAsync(Reservation reservation)
    {
        var node = await _nodes.Find(item => item.Id == reservation.MicrogridNodeId).FirstOrDefaultAsync();
        var slot = await _slots.Find(Builders<BsonDocument>.Filter.Eq("_id", reservation.BookingSlotId)).FirstOrDefaultAsync();
        DateTime? endTime = null;
        if (slot is not null && slot.TryGetValue("EndTime", out var endValue) && endValue.BsonType == BsonType.DateTime)
            endTime = endValue.ToUniversalTime();

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
            CancelledAtUtc = reservation.CancelledAtUtc,
            NodeName = node?.Name,
            EndTime = endTime
        };
    }
}
