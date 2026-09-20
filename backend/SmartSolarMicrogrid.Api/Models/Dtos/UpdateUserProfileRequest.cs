using System.ComponentModel.DataAnnotations;
using SmartSolarMicrogrid.Api.Models;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UpdateUserProfileRequest
{
    [Required]
    [StringLength(AccountValidationRules.FullNameMaximumLength, ErrorMessage = "Full name cannot exceed 100 characters.")]
    public string FullName { get; set; } = null!;

    [Required]
    [EmailAddress]
    [StringLength(AccountValidationRules.EmailMaximumLength, ErrorMessage = "Email cannot exceed 254 characters.")]
    public string? Email { get; set; }

    [RegularExpression(AccountValidationRules.PhonePattern, ErrorMessage = "Phone must contain 7-20 valid phone characters.")]
    public string? Phone { get; set; }
}
