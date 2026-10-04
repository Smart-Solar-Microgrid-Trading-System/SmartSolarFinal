/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: TransactionVerificationResponse.cs
 * Description: Defines the response model for verifying an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class TransactionVerificationResponse
{
    public bool Valid { get; init; }

    public string TransactionToken { get; init; } = string.Empty;

    public string ReservationId { get; init; } = string.Empty;

    public string ProsumerNic { get; init; } = string.Empty;

    public string ProsumerName { get; init; } = string.Empty;

    public string NodeId { get; init; } = string.Empty;

    public string NodeName { get; init; } = string.Empty;

    public string SlotId { get; init; } = string.Empty;

    public decimal EnergyAmountKw { get; init; }

    public DateTime StartTime { get; init; }

    public DateTime EndTime { get; init; }

    public string Status { get; init; } = string.Empty;

    public string Message { get; init; } = string.Empty;
}