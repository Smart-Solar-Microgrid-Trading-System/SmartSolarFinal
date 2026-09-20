namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class LoginResponse
{
    public string Token { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string AccountStatus { get; set; } = null!;
}
