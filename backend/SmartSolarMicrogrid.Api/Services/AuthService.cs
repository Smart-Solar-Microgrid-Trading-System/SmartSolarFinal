/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: AuthService.cs
 * Description: Authentication of users, creating access tokens, and changes passwords.
 */

using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public class AuthService
{
    private readonly IMongoCollection<User> _usersCollection;
    private readonly JwtSettings _jwtSettings;

    public AuthService(IMongoDatabase database, JwtSettings jwtSettings)
    {
        // Initializing user storage and authentication settings.
        _usersCollection = database.GetCollection<User>("Users");
        _jwtSettings = jwtSettings;
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        // Validating the credentials and create an access token.
        var identifier = request.Identifier.Trim();
        var user = await _usersCollection.Find(u => u.Id == identifier).FirstOrDefaultAsync();

        // Preserve exact username matches; only retry a legacy NIC for a Prosumer.
        if (user is null && identifier.Length == 10 &&
            Regex.IsMatch(identifier, AccountValidationRules.SriLankanNicPattern))
        {
            var nic = identifier.ToUpperInvariant();
            if (nic != identifier)
            {
                user = await _usersCollection.Find(u => u.Id == nic && u.Role == UserRoles.Prosumer)
                    .FirstOrDefaultAsync();
            }
        }

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return LoginResult.Unauthorized();
        }

        if (user.AccountStatus != AccountStatuses.Active)
        {
            return LoginResult.Forbidden($"Account is {user.AccountStatus}.");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_jwtSettings.Secret);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("session_version", user.SessionVersion),
                new Claim(ClaimTypes.Name, user.FullName)
            }),
            Expires = DateTime.UtcNow.AddHours(24),
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);

        return LoginResult.Success(new LoginResponse
        {
            Token = tokenHandler.WriteToken(token),
            Role = user.Role,
            Name = user.FullName,
            AccountStatus = user.AccountStatus
        });
    }
    public async Task<string?> ChangePasswordAsync(string userId, ChangePasswordRequest request)
    {
        // Validating and update the user's password.
        var user = await _usersCollection.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user is null || user.AccountStatus != AccountStatuses.Active)
            return "Account is unavailable.";
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return "Current password is incorrect.";
        if (BCrypt.Net.BCrypt.Verify(request.NewPassword, user.PasswordHash))
            return "New password must differ from your current password.";

        // Verify the old hash before updating the password.
        var result = await _usersCollection.UpdateOneAsync(
            u => u.Id == userId && u.PasswordHash == user.PasswordHash && u.AccountStatus == AccountStatuses.Active,
            Builders<User>.Update
                .Set(u => u.PasswordHash, BCrypt.Net.BCrypt.HashPassword(request.NewPassword))
                .Set(u => u.SessionVersion, Guid.NewGuid().ToString("N"))
                .Set(u => u.UpdatedAt, DateTime.UtcNow));
        return result.ModifiedCount == 1 ? null : "Account changed. Please sign in again and retry.";
    }
}

public sealed record JwtSettings(string Secret, string Issuer, string Audience);

public sealed class LoginResult
{
    private LoginResult(LoginResponse? response, string? error, bool isForbidden)
    {
        // Storing the authentication result.
        Response = response;
        Error = error;
        IsForbidden = isForbidden;
    }

    public LoginResponse? Response { get; }
    public string? Error { get; }
    public bool IsForbidden { get; }
    public bool IsUnauthorized => Error is not null && !IsForbidden;

    // Create a successful login result.
    public static LoginResult Success(LoginResponse response) => new(response, null, false);

    // Create an invalid credentials result.
    public static LoginResult Unauthorized() => new(null, "Invalid credentials.", false);

    // Create an account access rejection result.
    public static LoginResult Forbidden(string error) => new(null, error, true);
}
