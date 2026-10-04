/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Microgrid node Management
 * File Name: UpdateMicrogridNodeRequest.cs
 * Description: Defines the request model for updating an existing microgrid node.
 */
public sealed class UpdateMicrogridNodeRequest
{
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public decimal CapacityKw { get; set; }

    public int AvailableBatterySlots { get; set; }
}
