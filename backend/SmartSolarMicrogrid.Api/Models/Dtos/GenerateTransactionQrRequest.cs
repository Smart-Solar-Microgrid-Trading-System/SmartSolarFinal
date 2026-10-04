/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: GenerateTransactionQrRequest.cs
 * Description: Defines the request model for generating a QR code for an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class GenerateTransactionQrRequest
{
    public string ReservationId { get; set; } = string.Empty;
}