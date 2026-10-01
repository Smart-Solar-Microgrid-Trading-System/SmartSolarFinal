using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public class EnergyBookingSlot
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string NodeId { get; set; } = null!;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public decimal CapacityKw { get; set; }

    public string Status { get; set; } = BookingSlotStatuses.Available;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}