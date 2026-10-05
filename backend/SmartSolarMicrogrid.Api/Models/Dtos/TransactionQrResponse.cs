/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: TransactionQrResponse.cs
 * Description: Defines the response model used to return transaction QR information to the Prosumer mobile application.
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