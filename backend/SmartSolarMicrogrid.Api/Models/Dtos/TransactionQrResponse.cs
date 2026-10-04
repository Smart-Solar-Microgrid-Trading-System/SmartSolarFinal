/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: TransactionQrResponse.cs
 * Description: Defines the response model for generating a QR code for an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class TransactionQrResponse
{
    public string ReservationId { get; set; } = string.Empty;

    public string TransactionToken { get; set; } = string.Empty;

    public string QrPayload { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public string Status { get; set; } = string.Empty;
}