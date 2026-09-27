namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class GenerateTransactionQrRequest
{
    public string ReservationId { get; set; } = string.Empty;
}

public sealed class VerifyTransactionRequest
{
    public string TransactionToken { get; set; } = string.Empty;
}

public sealed class FinalizeTransactionRequest
{
    public string TransactionToken { get; set; } = string.Empty;
}

public sealed class TransactionQrResponse
{
    public string ReservationId { get; set; } = string.Empty;

    public string TransactionToken { get; set; } = string.Empty;

    public string QrPayload { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public string Status { get; set; } = string.Empty;
}

public sealed class TransactionVerificationResponse
{
    public bool Valid { get; set; }

    public string ReservationId { get; set; } = string.Empty;

    public string ProsumerNic { get; set; } = string.Empty;

    public string ProsumerName { get; set; } = string.Empty;

    public string NodeId { get; set; } = string.Empty;

    public string NodeName { get; set; } = string.Empty;

    public string SlotId { get; set; } = string.Empty;

    public double EnergyAmountKw { get; set; }

    public DateTime StartTime { get; set; }

    public DateTime EndTime { get; set; }

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;
}

public sealed class FinalizeTransactionResponse
{
    public bool Success { get; set; }

    public string ReservationId { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    public DateTime CompletedAt { get; set; }
}