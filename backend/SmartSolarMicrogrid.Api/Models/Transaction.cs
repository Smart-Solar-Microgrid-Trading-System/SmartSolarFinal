/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: Transaction.cs
 * Description: Defines the data model used to store energy transaction information, QR token details, transaction status, and completion information.
 */


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

    // SHA-256 hash of the QR transaction token.
    // The actual token is NOT stored in MongoDB.
    public string TransactionTokenHash { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public DateTime ExpiresAt { get; set; }

    public DateTime? VerifiedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string? CompletedByOperatorId { get; set; }
}