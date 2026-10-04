/*
 * Student Name: Ruwanmali K.H
 * Component: Reservation Monitoring and Dashboard
 * File Name: ReservationFilterRequest.cs
 * Description: Defines the search and filtering criteria used when retrieving reservations.
 */

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class ReservationFilterRequest
{
    public string? Search { get; set; }

    public string? Status { get; set; }

    public string? NodeId { get; set; }

    public DateTime? From { get; set; }

    public DateTime? To { get; set; }
}