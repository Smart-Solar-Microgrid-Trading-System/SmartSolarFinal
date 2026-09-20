namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class MicrogridNodeResponse
{
    public string Id { get; init; } = null!;
    public string Name { get; init; } = null!;
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public decimal CapacityKw { get; init; }
    public int AvailableBatterySlots { get; init; }
}
