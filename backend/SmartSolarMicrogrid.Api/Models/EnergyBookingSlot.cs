public sealed class EnergyBookingSlot
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string StationId { get; set; } = null!;

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = null!;

    public bool IsActive { get; set; }
}