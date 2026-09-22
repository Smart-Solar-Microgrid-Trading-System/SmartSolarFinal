namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class BookingSlotResponse
{
    public string Id { get; init; } = null!;

    public string NodeId { get; init; } = null!;

    public DateTime StartTime { get; init; }

    public DateTime EndTime { get; init; }

    public decimal CapacityKw { get; init; }

    public string Status { get; init; } = null!;

    public bool IsActive { get; init; }
}