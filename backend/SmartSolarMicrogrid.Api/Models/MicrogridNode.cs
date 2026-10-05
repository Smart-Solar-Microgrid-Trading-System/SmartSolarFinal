/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Microgrid Node Management
 * File Name: MicrogridNode.cs
 * Description: Defines the data model used to store microgrid node details such as location, capacity, status, and availability.
 */


using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public sealed class MicrogridNode
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Address { get; set; } = null!;

    public double Latitude { get; set; }

    public double Longitude { get; set; }

    public decimal CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }

    public bool IsActive { get; set; }
    
    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
