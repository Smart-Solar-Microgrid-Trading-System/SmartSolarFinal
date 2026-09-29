/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: ChangeEmailRequest.cs
 * Description: Defines the data that are required to change a user's email address.
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public sealed class ChangeEmailRequest
{
    [Required, EmailAddress, StringLength(254)]
    public string NewEmail { get; set; } = "";

    [Required]
    public string CurrentPassword { get; set; } = "";
}
