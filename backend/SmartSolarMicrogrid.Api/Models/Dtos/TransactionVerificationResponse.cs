/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: TransactionVerificationResponse.cs
 * Description: Defines the response model used to return verified reservation and transaction details to the Grid Operator mobile application.
 */


namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class TransactionVerificationResponse
{
    public bool Valid { get; init; }

    public string TransactionToken { get; init; } = string.Empty;

    public string ReservationId { get; init; } = string.Empty;

    public string Status { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;
}