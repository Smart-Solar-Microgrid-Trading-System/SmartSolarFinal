/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Transaction Management
 * File Name: FinalizeTransactionRequest.cs
 * Description: Defines the request model for finalizing an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class FinalizeTransactionRequest
{
    public string TransactionToken { get; set; } = string.Empty;
}