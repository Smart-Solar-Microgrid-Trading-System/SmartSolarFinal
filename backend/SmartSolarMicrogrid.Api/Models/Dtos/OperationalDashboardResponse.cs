/*
 * Student Name: Ruwanmali K.H
 * Component: Operational Dashboard
 * File Name: OperationalDashboardResponse.cs
 * Description: Defines the reservation summary values displayed on operational
 *              and Prosumer dashboards.
 */


namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class OperationalDashboardResponse
{
    public long PendingReservations { get; init; }

    public long ApprovedFutureReservations { get; init; }

    public long CurrentBookings { get; init; }

    public long CompletedToday { get; init; }
}