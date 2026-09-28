public sealed class UpdateMicrogridNodeRequest
{
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public decimal CapacityKw { get; set; }

    public int availableBatterySlots { get; set; }
}