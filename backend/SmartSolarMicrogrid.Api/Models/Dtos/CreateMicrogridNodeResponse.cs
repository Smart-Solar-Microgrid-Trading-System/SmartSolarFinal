/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Microgrid node Management
 * File Name: CreateMicrogridNodeRequest.cs
 * Description: Defines the request model for creating a new microgrid node, including validation rules.
 */
public sealed class CreateMicrogridNodeRequest
{
    public string Name { get; set; } = null!;
    public string Address { get; set; } = null!;

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public decimal CapacityKw { get; set; }
    public int availableBatterySlots { get; set; }
}