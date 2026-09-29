/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: LoginRequest.cs
 * Description: Defines the credentials required to sign in.
 */

using System.ComponentModel.DataAnnotations;

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class LoginRequest
{
    [Required]
    public string Identifier { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}
