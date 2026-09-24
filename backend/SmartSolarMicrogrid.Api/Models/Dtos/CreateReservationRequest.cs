/*
 * Energy Reservation Management
 * Defines client input for creating a reservation; the owner and schedule are server-derived.
 */
using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class CreateReservationRequest
{
    [Required]
    public string MicrogridNodeId { get; set; } = null!;

    [Required]
    public string BookingSlotId { get; set; } = null!;

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal EnergyAmountKwh { get; set; }
}
