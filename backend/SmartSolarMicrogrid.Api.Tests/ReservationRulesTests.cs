/*
 * Energy Reservation Management Tests
 * Verifies exact scheduling, modification, cancellation, and energy boundaries.
 */
using SmartSolarMicrogrid.Api.Services;
using Xunit;

namespace SmartSolarMicrogrid.Api.Tests;

public sealed class ReservationRulesTests
{
    private static readonly DateTime UtcNow = new(2026, 9, 23, 0, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void ScheduledStart_MustBeInFuture()
    {
        // Verify that a start equal to the current time is not considered future.
        Assert.NotNull(ReservationRules.ValidateScheduledStart(UtcNow, UtcNow));
    }

    [Fact]
    public void ScheduledStart_AllowsFutureTimeWithinSevenDays()
    {
        // Verify an ordinary future slot inside the scheduling window is accepted.
        Assert.Null(ReservationRules.ValidateScheduledStart(UtcNow.AddDays(2), UtcNow));
    }

    [Fact]
    public void ScheduledStart_AllowsExactlySevenDays()
    {
        // Verify the inclusive upper boundary required by the assignment.
        Assert.Null(ReservationRules.ValidateScheduledStart(UtcNow.AddDays(7), UtcNow));
    }

    [Fact]
    public void ScheduledStart_RejectsMoreThanSevenDays()
    {
        // Verify that even one tick beyond the seven-day limit is rejected.
        Assert.NotNull(ReservationRules.ValidateScheduledStart(UtcNow.AddDays(7).AddTicks(1), UtcNow));
    }

    [Fact]
    public void ModificationWindow_AllowsExactlyTwelveHours()
    {
        // Verify that exactly twelve hours of notice satisfies the stated rule.
        Assert.Null(ReservationRules.ValidateModificationWindow(UtcNow.AddHours(12), UtcNow, "modified"));
    }

    [Fact]
    public void ModificationWindow_RejectsLessThanTwelveHours()
    {
        // Verify that one tick under twelve hours is prohibited.
        Assert.NotNull(ReservationRules.ValidateModificationWindow(UtcNow.AddHours(12).AddTicks(-1), UtcNow, "modified"));
    }

    [Fact]
    public void CancellationWindow_AllowsExactlyTwelveHours()
    {
        // Verify cancellation follows the same inclusive twelve-hour boundary.
        Assert.Null(ReservationRules.ValidateModificationWindow(UtcNow.AddHours(12), UtcNow, "cancelled"));
    }

    [Fact]
    public void CancellationWindow_RejectsLessThanTwelveHours()
    {
        // Verify cancellation is prohibited when notice is one tick under twelve hours.
        Assert.NotNull(ReservationRules.ValidateModificationWindow(UtcNow.AddHours(12).AddTicks(-1), UtcNow, "cancelled"));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void EnergyAmount_RejectsNonPositiveValues(decimal amount)
    {
        // Verify server-side protection independent of request model validation.
        Assert.NotNull(ReservationRules.ValidateEnergyAmount(amount));
    }

    [Fact]
    public void EnergyAmount_AllowsPositiveValue()
    {
        // Verify the smallest representative positive value is accepted.
        Assert.Null(ReservationRules.ValidateEnergyAmount(0.01m));
    }
}
