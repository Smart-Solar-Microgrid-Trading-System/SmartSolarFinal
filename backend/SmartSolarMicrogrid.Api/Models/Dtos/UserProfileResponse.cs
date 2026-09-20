namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UserProfileResponse
{
    public string Id { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public string AccountStatus { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
