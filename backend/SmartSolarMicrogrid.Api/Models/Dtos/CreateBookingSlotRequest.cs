using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class CreateBookingSlotRequest
{
    [Required]
    public string NodeId { get; set; } = null!;

    [Required]
    public DateTime StartTime { get; set; }

    [Required]
    public DateTime EndTime { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal CapacityKw { get; set; }
}