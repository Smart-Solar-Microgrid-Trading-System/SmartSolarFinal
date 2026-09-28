using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class ChangeEmailRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string NewEmail { get; set; } = "";

    [Required]
    public string CurrentPassword { get; set; } = "";
}
