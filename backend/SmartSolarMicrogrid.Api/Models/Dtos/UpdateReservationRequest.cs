/*
 * Component: Energy Reservation Management
 * File: UpdateReservationRequest.cs
 * Purpose: Defines the slot and energy values that staff may change on a reservation.
 */
using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UpdateReservationRequest
{
    [Required]
    public string SlotId { get; set; } = null!;

    [Range(typeof(decimal), "0.01", "79228162514264337593543950335")]
    public decimal EnergyAmountKw { get; set; }
}
