namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class ReservationFilterRequest
{
    public string? Search { get; set; }

    public string? Status { get; set; }

    public string? NodeId { get; set; }

    public DateTime? From { get; set; }

    public DateTime? To { get; set; }
}