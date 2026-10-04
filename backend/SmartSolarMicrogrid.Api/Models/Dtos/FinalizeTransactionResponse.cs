/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Transaction Management
 * File Name: FinalizeTransactionResponse.cs
 * Description: Defines the response model for finalizing an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class FinalizeTransactionResponse
{
    public bool Success { get; set; }

    public string ReservationId { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public DateTime CompletedAt { get; set; }
}