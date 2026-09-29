/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: LoginResponse.cs
 * Description: Defines the account and token data returned after login.
 */

namespace SmartSolarMicrogrid.Api.Models.Dtos;

public class LoginResponse
{
    public string Token { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string AccountStatus { get; set; } = null!;
}
