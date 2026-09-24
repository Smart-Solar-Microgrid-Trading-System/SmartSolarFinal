/*
 * Energy Reservation Management
 * Defines shared reservation status values without implementing operator transitions.
 */
namespace SmartSolarMicrogrid.Api.Models;

public static class ReservationStatuses
{
    public const string Pending = "Pending";
    public const string Approved = "Approved";
    public const string Rejected = "Rejected";
    public const string Completed = "Completed";
    public const string Cancelled = "Cancelled";
}
