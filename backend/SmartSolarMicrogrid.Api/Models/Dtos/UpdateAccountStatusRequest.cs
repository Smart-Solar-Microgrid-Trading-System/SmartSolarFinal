/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: UpdateAccountStatusRequest.cs
 * Description: Defines the data required to update an account status.
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class UpdateAccountStatusRequest
{
    [Required]
    public string AccountStatus { get; set; } = null!;
}
