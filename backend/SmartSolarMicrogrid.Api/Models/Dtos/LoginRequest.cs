using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class LoginRequest
{
    [Required]
    public string Identifier { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}
