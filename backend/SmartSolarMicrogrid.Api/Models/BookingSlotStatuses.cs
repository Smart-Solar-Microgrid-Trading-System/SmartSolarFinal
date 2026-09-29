/*
 * Student Name: Ruwanmali K.H
 * Component: Booking Slot Management
 * File Name: BookingSlotStatuses.cs
 * Description: Defines the supported status values used for energy booking slots.
 */

namespace SmartSolarMicrogrid.Api.Models;

public static class BookingSlotStatuses
{
    public const string Available = "Available";
    public const string Reserved = "Reserved";
    public const string Unavailable = "Unavailable";
    public const string Completed = "Completed";
}