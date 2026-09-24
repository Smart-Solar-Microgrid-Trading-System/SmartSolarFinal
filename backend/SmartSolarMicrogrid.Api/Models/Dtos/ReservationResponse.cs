namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class ReservationResponse
{
    public string Id { get; init; } = null!;

    public string ProsumerNic { get; init; } = null!;

    public string? ProsumerName { get; init; }

    public string? ProsumerStatus { get; init; }

    public string NodeId { get; init; } = null!;

    public string? NodeName { get; init; }

    public string SlotId { get; init; } = null!;

    public decimal EnergyAmountKw { get; init; }

    public DateTime StartTime { get; init; }

    public DateTime EndTime { get; init; }

    public string Status { get; init; } = null!;

    public DateTime CreatedAt { get; init; }

    public DateTime UpdatedAt { get; init; }

    public DateTime? CancelledAt { get; init; }

    public DateTime? CompletedAt { get; init; }
}
