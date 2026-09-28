namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class VerifyTransactionRequest
{
	public string TransactionToken { get; set; } = string.Empty;
}