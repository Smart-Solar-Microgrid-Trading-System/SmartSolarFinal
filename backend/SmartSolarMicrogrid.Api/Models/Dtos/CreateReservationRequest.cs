using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class CreateReservationRequest
{
    [Required]
    public string ProsumerNic { get; set; } = null!;

    [Required]
    public string NodeId { get; set; } = null!;

    [Required]
    public string SlotId { get; set; } = null!;

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal EnergyAmountKw { get; set; }
}
