using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public sealed class MicrogridNode
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public decimal CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }

    public bool IsActive { get; set; }
}
