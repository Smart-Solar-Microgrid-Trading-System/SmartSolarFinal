namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class EnergyBookingSlotResponse
{
    public string Id { get; init; } = null!;

    public string StationId { get; init; } = null!;

    public DateTime StartTime { get; init; }

    public DateTime EndTime { get; init; }

    public string Status { get; init; } = null!;

    public bool IsActive { get; init; }
}