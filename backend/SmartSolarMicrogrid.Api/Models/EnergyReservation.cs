using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public class EnergyReservation
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string ProsumerNic { get; set; } = null!;

    public string NodeId { get; set; } = null!;

    public string SlotId { get; set; } = null!;

    public decimal EnergyAmountKw { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = ReservationStatuses.Pending;

    public string? TransactionCode { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CancelledAt { get; set; }

    public DateTime? CompletedAt { get; set; }
}