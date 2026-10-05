/*
 * Student Name: Ruwanmali K.H
 * Component: Reservation Monitoring and Dashboard
 * File Name: ReservationStatuses.cs
 * Description: Uses reservation states for monitoring, approval, rejection,
 *              completion, and dashboard operations.
 */

/*
 * Student Name: Rathnayake R.M.S.B
 * Component: Energy Reservation Management
 * File Name: ReservationStatuses.cs
 * Description: Defines the shared status values used by reservation CRUD rules
 *              and soft cancellation.
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
