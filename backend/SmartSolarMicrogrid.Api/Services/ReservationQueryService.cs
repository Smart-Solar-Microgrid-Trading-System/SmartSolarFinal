using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public class ReservationQueryService
{
    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<MicrogridNode> _nodes;

    public ReservationQueryService(IMongoDatabase database)
    {
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservations");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetAllAsync(
        ReservationFilterRequest request,
        string userId,
        string role)
    {
        // Start with all reservations
        var filter = Builders<EnergyReservation>.Filter.Empty;

        if (role == UserRoles.Prosumer)
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.ProsumerNic,
                userId);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.Status,
                request.Status);
        }

        if (!string.IsNullOrWhiteSpace(request.NodeId))
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.NodeId,
                request.NodeId);
        }

        if (request.From.HasValue)
        {
            filter &= Builders<EnergyReservation>.Filter.Gte(
                reservation => reservation.StartTime,
                request.From.Value);
        }

        if (request.To.HasValue)
        {
            filter &= Builders<EnergyReservation>.Filter.Lte(
                reservation => reservation.StartTime,
                request.To.Value);
        }

        var reservations = await _reservations
            .Find(filter)
            .SortByDescending(reservation => reservation.StartTime)
            .ToListAsync();

        // Search by basic booking information
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            reservations = reservations
                .Where(reservation =>
                    reservation.Id.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    reservation.ProsumerNic.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    reservation.NodeId.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                    reservation.SlotId.Contains(search, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return await ConvertToResponseAsync(reservations);
    }

    public async Task<ReservationResponse?> GetByIdAsync(
        string id,
        string userId,
        string role)
    {
        // Find one reservation
        var reservation = await _reservations
            .Find(reservation => reservation.Id == id)
            .FirstOrDefaultAsync();

        if (reservation == null)
        {
            return null;
        }

        if (role == UserRoles.Prosumer &&
            reservation.ProsumerNic != userId)
        {
            return null;
        }

        var node = await _nodes
            .Find(node => node.Id == reservation.NodeId)
            .FirstOrDefaultAsync();

        return new ReservationResponse
        {
            Id = reservation.Id,
            ProsumerNic = reservation.ProsumerNic,
            NodeId = reservation.NodeId,
            NodeName = node?.Name,
            SlotId = reservation.SlotId,
            EnergyAmountKw = reservation.EnergyAmountKw,
            StartTime = reservation.StartTime,
            EndTime = reservation.EndTime,
            Status = reservation.Status
        };
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetCurrentAsync(
        string userId,
        string role)
    {
        // Current bookings are pending or approved bookings that have not ended yet
        var statuses = new[]
        {
            ReservationStatuses.Pending,
            ReservationStatuses.Approved
        };

        var filter = Builders<EnergyReservation>.Filter.In(
            reservation => reservation.Status,
            statuses);

        filter &= Builders<EnergyReservation>.Filter.Gte(
            reservation => reservation.EndTime,
            DateTime.UtcNow);

        if (role == UserRoles.Prosumer)
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.ProsumerNic,
                userId);
        }

        var reservations = await _reservations
            .Find(filter)
            .SortBy(reservation => reservation.StartTime)
            .ToListAsync();

        return await ConvertToResponseAsync(reservations);
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetPendingAsync(
        string userId,
        string role)
    {
        // Get reservations waiting for approval
        var filter = Builders<EnergyReservation>.Filter.Eq(
            reservation => reservation.Status,
            ReservationStatuses.Pending);

        if (role == UserRoles.Prosumer)
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.ProsumerNic,
                userId);
        }

        var reservations = await _reservations
            .Find(filter)
            .SortBy(reservation => reservation.StartTime)
            .ToListAsync();

        return await ConvertToResponseAsync(reservations);
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetHistoryAsync(
        string userId,
        string role)
    {
        // These statuses are considered booking history
        var statuses = new[]
        {
            ReservationStatuses.Completed,
            ReservationStatuses.Cancelled,
            ReservationStatuses.Rejected
        };

        var filter = Builders<EnergyReservation>.Filter.In(
            reservation => reservation.Status,
            statuses);

        if (role == UserRoles.Prosumer)
        {
            filter &= Builders<EnergyReservation>.Filter.Eq(
                reservation => reservation.ProsumerNic,
                userId);
        }

        var reservations = await _reservations
            .Find(filter)
            .SortByDescending(reservation => reservation.EndTime)
            .ToListAsync();

        return await ConvertToResponseAsync(reservations);
    }

    public async Task<OperationalDashboardResponse> GetDashboardAsync()
    {
        // Dashboard values are read directly from the reservation collection
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);

        var pendingCount = await _reservations.CountDocumentsAsync(
            reservation =>
                reservation.Status == ReservationStatuses.Pending);

        var approvedFutureCount = await _reservations.CountDocumentsAsync(
            reservation =>
                reservation.Status == ReservationStatuses.Approved &&
                reservation.StartTime > now);

        var currentCount = await _reservations.CountDocumentsAsync(
            reservation =>
                (reservation.Status == ReservationStatuses.Pending ||
                 reservation.Status == ReservationStatuses.Approved) &&
                reservation.EndTime >= now);

        var completedTodayCount = await _reservations.CountDocumentsAsync(
            reservation =>
                reservation.Status == ReservationStatuses.Completed &&
                reservation.CompletedAt.HasValue &&
                reservation.CompletedAt.Value >= today &&
                reservation.CompletedAt.Value < tomorrow);

        return new OperationalDashboardResponse
        {
            PendingReservations = pendingCount,
            ApprovedFutureReservations = approvedFutureCount,
            CurrentBookings = currentCount,
            CompletedToday = completedTodayCount
        };
    }

    private async Task<IReadOnlyList<ReservationResponse>> ConvertToResponseAsync(
        List<EnergyReservation> reservations)
    {
        var result = new List<ReservationResponse>();

        foreach (var reservation in reservations)
        {
            var node = await _nodes
                .Find(node => node.Id == reservation.NodeId)
                .FirstOrDefaultAsync();

            result.Add(new ReservationResponse
            {
                Id = reservation.Id,
                ProsumerNic = reservation.ProsumerNic,
                NodeId = reservation.NodeId,
                NodeName = node?.Name,
                SlotId = reservation.SlotId,
                EnergyAmountKw = reservation.EnergyAmountKw,
                StartTime = reservation.StartTime,
                EndTime = reservation.EndTime,
                Status = reservation.Status
            });
        }

        return result;
    }
}