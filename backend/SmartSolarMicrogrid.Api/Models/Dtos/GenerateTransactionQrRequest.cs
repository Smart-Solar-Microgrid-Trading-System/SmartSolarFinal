namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class GenerateTransactionQrRequest
{
    public string ReservationId { get; set; } = string.Empty;
}