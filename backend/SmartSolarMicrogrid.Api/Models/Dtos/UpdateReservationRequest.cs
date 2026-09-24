/*
 * Energy Reservation Management
 * Defines the reservation-owned fields that a Prosumer may update.
 */
using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UpdateReservationRequest
{
    [Required]
    public string MicrogridNodeId { get; set; } = null!;

    [Required]
    public string BookingSlotId { get; set; } = null!;

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal EnergyAmountKwh { get; set; }
}
