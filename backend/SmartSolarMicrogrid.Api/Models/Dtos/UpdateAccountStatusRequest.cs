using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UpdateAccountStatusRequest
{
    [Required]
    public string AccountStatus { get; set; } = null!;
}
