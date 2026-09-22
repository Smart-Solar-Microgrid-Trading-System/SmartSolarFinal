/*
 * Energy Reservation Management
 * Centralizes time and value rules so boundary behavior is deterministic and testable.
 */
namespace SmartSolarMicrogrid.Api.Services;

public static class ReservationRules
{
    public static readonly TimeSpan MaximumAdvance = TimeSpan.FromDays(7);
    public static readonly TimeSpan MinimumModificationNotice = TimeSpan.FromHours(12);

    public static string? ValidateScheduledStart(DateTime scheduledStartUtc, DateTime utcNow)
    {
        // Normalize supplied values before enforcing the future and seven-day limits.
        var start = scheduledStartUtc.ToUniversalTime();
        var now = utcNow.ToUniversalTime();

        if (start <= now)
        {
            return "The reservation must be scheduled for a future time.";
        }

        if (start > now.Add(MaximumAdvance))
        {
            return "The reservation cannot be scheduled more than seven days in advance.";
        }

        return null;
    }

    public static string? ValidateModificationWindow(DateTime scheduledStartUtc, DateTime utcNow, string operation)
    {
        // Permit exactly twelve hours of notice and reject any shorter interval.
        var remaining = scheduledStartUtc.ToUniversalTime() - utcNow.ToUniversalTime();
        return remaining < MinimumModificationNotice
            ? $"A reservation cannot be {operation} when fewer than 12 hours remain before its scheduled start."
            : null;
    }

    public static string? ValidateEnergyAmount(decimal energyAmountKwh)
    {
        // Require a positive energy amount independently of automatic model validation.
        return energyAmountKwh <= 0 ? "Energy amount must be greater than zero." : null;
    }
}
