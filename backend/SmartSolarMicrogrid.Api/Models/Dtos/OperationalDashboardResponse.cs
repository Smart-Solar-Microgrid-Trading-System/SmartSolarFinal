namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class OperationalDashboardResponse
{
    public long PendingReservations { get; init; }

    public long ApprovedFutureReservations { get; init; }

    public long CurrentBookings { get; init; }

    public long CompletedToday { get; init; }
}