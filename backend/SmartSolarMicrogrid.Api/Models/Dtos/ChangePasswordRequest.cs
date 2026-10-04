/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: ChangePasswordRequest.cs
 * Description: Definition and validation the data required to change a password.
 */

using System.ComponentModel.DataAnnotations;
using System.Text;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class ChangePasswordRequest : IValidatableObject
{
    [Required]
    public string CurrentPassword { get; set; } = "";

    [Required]
    [StringLength(
        AccountValidationRules.PasswordMaximumLength,
        MinimumLength = AccountValidationRules.PasswordMinimumLength)]
    public string NewPassword { get; set; } = "";

    [Required]
    [Compare(nameof(NewPassword), ErrorMessage = "New passwords must match.")]
    public string ConfirmNewPassword { get; set; } = "";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Check the password's encoded byte length.
        if (Encoding.UTF8.GetByteCount(NewPassword ?? "") > 72)
        {
            yield return new ValidationResult(
                "New password must not exceed 72 UTF-8 bytes.",
                new[] { nameof(NewPassword) });
        }
    }
}
