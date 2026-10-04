/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Microgrid node Management
 * File Name: MicrogridNodeResponse.cs
 * Description: Defines the structure of the response model for microgrid node data, 
 * including properties for identification, location, capacity, and status.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class MicrogridNodeResponse
{
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