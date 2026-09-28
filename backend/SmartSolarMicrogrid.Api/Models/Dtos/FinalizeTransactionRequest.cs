namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class FinalizeTransactionRequest
{
    public string TransactionToken { get; set; } = string.Empty;
}