using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public class AuthService
{
    private readonly IMongoCollection<User> _usersCollection;
    private readonly IConfiguration _config;

    public AuthService(IMongoDatabase database, IConfiguration config)
    {
        _usersCollection = database.GetCollection<User>("Users");
        _config = config;
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        var user = await _usersCollection.Find(u => u.Id == request.Identifier).FirstOrDefaultAsync();

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return LoginResult.Unauthorized();
        }

        if (user.AccountStatus != AccountStatuses.Active)
        {
            return LoginResult.Forbidden($"Account is {user.AccountStatus}.");
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_config["Jwt:Secret"]!);
        
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim(ClaimTypes.Name, user.FullName)
            }),
            Expires = DateTime.UtcNow.AddHours(24),
            Issuer = _config["Jwt:Issuer"],
            Audience = _config["Jwt:Audience"],
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
}

public sealed class LoginResult
{
    private LoginResult(LoginResponse? response, string? error, bool isForbidden)
    {
        Response = response;
        Error = error;
        IsForbidden = isForbidden;
    }

    public LoginResponse? Response { get; }
    public string? Error { get; }
    public bool IsForbidden { get; }
    public bool IsUnauthorized => Error is not null && !IsForbidden;

    public static LoginResult Success(LoginResponse response) => new(response, null, false);
    public static LoginResult Unauthorized() => new(null, "Invalid credentials.", false);
    public static LoginResult Forbidden(string error) => new(null, error, true);
}
