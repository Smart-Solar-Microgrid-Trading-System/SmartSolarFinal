/*
 * Student Name: Ruwanmali K.H
 * Component: Reservation Monitoring and Dashboard
 * File Name: ReservationStatuses.cs
 * Description: Defines the supported status values used for energy reservations.
 */

namespace SmartSolarMicrogrid.Api.Models;

public static class ReservationStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Cancelled = "Cancelled";
    public const string Completed = "Completed";
}