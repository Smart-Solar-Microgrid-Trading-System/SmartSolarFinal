namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class ReservationResponse
{
    public string Id { get; init; } = null!;

    public string ProsumerNic { get; init; } = null!;

    public string NodeId { get; init; } = null!;

    public string? NodeName { get; init; }

    public string SlotId { get; init; } = null!;

    public decimal EnergyAmountKw { get; init; }

    public DateTime StartTime { get; init; }

    public DateTime EndTime { get; init; }

    public string Status { get; init; } = null!;
}