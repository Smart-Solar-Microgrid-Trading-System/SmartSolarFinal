/*
 * Energy Reservation Management
 * Stores a Prosumer-owned reservation for an energy booking slot.
 */
using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public sealed class Reservation
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string ProsumerId { get; set; } = null!;

    public string MicrogridNodeId { get; set; } = null!;

    public string BookingSlotId { get; set; } = null!;

    public DateTime ScheduledStartUtc { get; set; }

    public decimal EnergyAmountKwh { get; set; }

    public string Status { get; set; } = ReservationStatuses.Pending;

    public DateTime CreatedAtUtc { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public DateTime? CancelledAtUtc { get; set; }
}
