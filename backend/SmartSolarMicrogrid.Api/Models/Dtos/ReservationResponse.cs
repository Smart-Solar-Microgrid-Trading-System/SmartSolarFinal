/*
 * Energy Reservation Management
 * Defines the reservation summary returned after reads and mutations.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class ReservationResponse
{
    public string Id { get; init; } = null!;
    public string ProsumerId { get; init; } = null!;
    public string MicrogridNodeId { get; init; } = null!;
    public string BookingSlotId { get; init; } = null!;
    public DateTime ScheduledStartUtc { get; init; }
    public decimal EnergyAmountKwh { get; init; }
    public string Status { get; init; } = null!;
    public DateTime CreatedAtUtc { get; init; }
    public DateTime UpdatedAtUtc { get; init; }
    public DateTime? CancelledAtUtc { get; init; }
    public string? NodeName { get; init; }
    public DateTime? EndTime { get; init; }

    // Compatibility aliases retained for existing operator/booking consumers.
    public string ProsumerNic => ProsumerId;
    public string NodeId => MicrogridNodeId;
    public string SlotId => BookingSlotId;
    public decimal EnergyAmountKw => EnergyAmountKwh;
    public DateTime StartTime => ScheduledStartUtc;
}
