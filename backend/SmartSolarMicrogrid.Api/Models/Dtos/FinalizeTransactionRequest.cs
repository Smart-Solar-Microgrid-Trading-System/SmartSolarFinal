/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: FinalizeTransactionRequest.cs
 * Description: Defines the request model used by a Grid Operator to finalize a verified energy transaction.
 */


namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class FinalizeTransactionRequest
{
    public string TransactionToken { get; set; } = string.Empty;
}