using MongoDB.Bson.Serialization.Attributes;

namespace SmartSolarMicrogrid.Api.Models;

public class User
{
    [BsonId]
    public string Id { get; set; } = null!; // NIC for Prosumer, username for Backoffice/GridOperator

    public string PasswordHash { get; set; } = null!;

    public string Role { get; set; } = null!; // Backoffice, GridOperator, Prosumer

    public string FullName { get; set; } = null!;

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string AccountStatus { get; set; } = "Pending"; // Active, Pending, Deactivated

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
