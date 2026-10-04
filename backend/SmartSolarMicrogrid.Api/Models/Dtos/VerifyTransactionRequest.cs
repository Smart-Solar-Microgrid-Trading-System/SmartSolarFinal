/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: VerifyTransactionRequest.cs
 * Description: Defines the request model for verifying an energy transaction.
 */
namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class VerifyTransactionRequest
{
	public string TransactionToken { get; set; } = string.Empty;
}