/*
 * Student Name: Rathnayake R.M.S.B
 * Component: Energy Reservation Management
 * File Name: UpdateReservationRequest.cs
 * Description: Defines the booking slot and energy values that may be changed
 *              on an existing reservation.
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
