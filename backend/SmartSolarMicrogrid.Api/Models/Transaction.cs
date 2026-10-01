using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public sealed class EnergyTransaction
{
    [BsonId]
    public string Id { get; set; } = null!;

    public string ReservationId { get; set; } = null!;

    public string NodeId { get; set; } = null!;

    public string SlotId { get; set; } = null!;

    public string ProsumerId { get; set; } = null!;

    public string GridOperatorId { get; set; } = null!;

    // SHA-256 hash used to verify the QR transaction token.
    public string TransactionTokenHash { get; set; } = null!;

    // Protected QR payload retained so the Prosumer can display
    // the same active QR again without storing a readable token.
    public string? ProtectedQrPayload { get; set; }

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? CompletedByOperatorId { get; set; }
}