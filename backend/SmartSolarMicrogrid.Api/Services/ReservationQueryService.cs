using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public class ReservationQueryService
{
    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<User> _users;

    public ReservationQueryService(IMongoDatabase database)
    {
        // Gets the MongoDB collections used for reservation queries.
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservations");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _users = database.GetCollection<User>("Users");
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetAllAsync(
        ReservationFilterRequest request,
        string userId,
        string role)
    {
        // Retrieves reservations based on the logged-in user's role and selected filters.
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

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();

            reservations = reservations
                .Where(reservation =>
                    reservation.Id.Contains(
                        search,
                        StringComparison.OrdinalIgnoreCase) ||
                    reservation.ProsumerNic.Contains(
                        search,
                        StringComparison.OrdinalIgnoreCase) ||
                    reservation.NodeId.Contains(
                        search,
                        StringComparison.OrdinalIgnoreCase) ||
                    reservation.SlotId.Contains(
                        search,
                        StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        return await ConvertToResponseAsync(reservations);
    }

    public async Task<ReservationResponse?> GetByIdAsync(
        string id,
        string userId,
        string role)
    {
        // Retrieves one reservation while applying role-based access restrictions.
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

        var prosumer = await _users
            .Find(user =>
                user.Id == reservation.ProsumerNic &&
                user.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();

        return new ReservationResponse
        {
            Id = reservation.Id,
            ProsumerNic = reservation.ProsumerNic,
            ProsumerName = prosumer?.FullName,
            ProsumerStatus = prosumer?.AccountStatus,
            NodeId = reservation.NodeId,
            NodeName = node?.Name,
            SlotId = reservation.SlotId,
            EnergyAmountKw = reservation.EnergyAmountKw,
            StartTime = reservation.StartTime,
            EndTime = reservation.EndTime,
            Status = reservation.Status,
            CreatedAt = reservation.CreatedAt,
            UpdatedAt = reservation.UpdatedAt,
            CancelledAt = reservation.CancelledAt,
            CompletedAt = reservation.CompletedAt
        };
    }

    public async Task<IReadOnlyList<ReservationResponse>> GetCurrentAsync(
        string userId,
        string role)
    {
        // Retrieves pending or approved reservations that have not ended yet.
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
        // Retrieves reservations that are currently waiting for approval.
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
        // Retrieves completed, cancelled, and rejected reservations as booking history.
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
        // Calculates system-wide reservation values for the operational dashboard.
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

    public async Task<OperationalDashboardResponse> GetProsumerDashboardAsync(
        string prosumerNic)
    {
        // Calculates dashboard values only for the currently logged-in Prosumer.
        var now = DateTime.UtcNow;
        var today = now.Date;
        var tomorrow = today.AddDays(1);

        var pendingFilter =
            Builders<EnergyReservation>.Filter.And(
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.ProsumerNic,
                    prosumerNic),
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.Status,
                    ReservationStatuses.Pending)
            );

        var approvedFutureFilter =
            Builders<EnergyReservation>.Filter.And(
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.ProsumerNic,
                    prosumerNic),
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.Status,
                    ReservationStatuses.Approved),
                Builders<EnergyReservation>.Filter.Gt(
                    reservation => reservation.StartTime,
                    now)
            );

        var currentFilter =
            Builders<EnergyReservation>.Filter.And(
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.ProsumerNic,
                    prosumerNic),
                Builders<EnergyReservation>.Filter.In(
                    reservation => reservation.Status,
                    new[]
                    {
                        ReservationStatuses.Pending,
                        ReservationStatuses.Approved
                    }),
                Builders<EnergyReservation>.Filter.Gte(
                    reservation => reservation.EndTime,
                    now)
            );

        var completedTodayFilter =
            Builders<EnergyReservation>.Filter.And(
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.ProsumerNic,
                    prosumerNic),
                Builders<EnergyReservation>.Filter.Eq(
                    reservation => reservation.Status,
                    ReservationStatuses.Completed),
                Builders<EnergyReservation>.Filter.Gte(
                    reservation => reservation.CompletedAt,
                    today),
                Builders<EnergyReservation>.Filter.Lt(
                    reservation => reservation.CompletedAt,
                    tomorrow)
            );

        var pendingCount =
            await _reservations.CountDocumentsAsync(
                pendingFilter);

        var approvedFutureCount =
            await _reservations.CountDocumentsAsync(
                approvedFutureFilter);

        var currentCount =
            await _reservations.CountDocumentsAsync(
                currentFilter);

        var completedTodayCount =
            await _reservations.CountDocumentsAsync(
                completedTodayFilter);

        return new OperationalDashboardResponse
        {
            PendingReservations = pendingCount,
            ApprovedFutureReservations = approvedFutureCount,
            CurrentBookings = currentCount,
            CompletedToday = completedTodayCount
        };
    }

    private async Task<IReadOnlyList<ReservationResponse>>
        ConvertToResponseAsync(
            List<EnergyReservation> reservations)
    {
        // Converts reservation database records into API response objects.
        var result =
            new List<ReservationResponse>();

        foreach (var reservation in reservations)
        {
            var node = await _nodes
                .Find(node =>
                    node.Id == reservation.NodeId)
                .FirstOrDefaultAsync();

            var prosumer = await _users
                .Find(user =>
                    user.Id == reservation.ProsumerNic &&
                    user.Role == UserRoles.Prosumer)
                .FirstOrDefaultAsync();

            result.Add(
                new ReservationResponse
                {
                    Id = reservation.Id,
                    ProsumerNic = reservation.ProsumerNic,
                    ProsumerName = prosumer?.FullName,
                    ProsumerStatus = prosumer?.AccountStatus,
                    NodeId = reservation.NodeId,
                    NodeName = node?.Name,
                    SlotId = reservation.SlotId,
                    EnergyAmountKw = reservation.EnergyAmountKw,
                    StartTime = reservation.StartTime,
                    EndTime = reservation.EndTime,
                    Status = reservation.Status,
                    CreatedAt = reservation.CreatedAt,
                    UpdatedAt = reservation.UpdatedAt,
                    CancelledAt = reservation.CancelledAt,
                    CompletedAt = reservation.CompletedAt
                });
        }

        return result;
    }
}