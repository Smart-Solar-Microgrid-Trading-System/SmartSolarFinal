namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class TransactionVerificationResponse
{
    public bool Valid { get; init; }

    public string TransactionToken { get; init; } = string.Empty;

    public string ReservationId { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;
}