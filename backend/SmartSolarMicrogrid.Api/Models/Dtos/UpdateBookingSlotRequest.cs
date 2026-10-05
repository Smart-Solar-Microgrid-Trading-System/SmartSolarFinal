/*
 * Student Name: Ruwanmali K.H
 * Component: Booking Slot Management
 * File Name: UpdateBookingSlotRequest.cs
 * Description: Defines the request data required to update an existing booking slot.
 */


using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class UpdateBookingSlotRequest
{
    [Required]
    public DateTime StartTime { get; set; }

    [Required]
    public DateTime EndTime { get; set; }

    [Range(0.01, double.MaxValue)]
    public decimal CapacityKw { get; set; }

    [Required]
    public string Status { get; set; } = null!;
}