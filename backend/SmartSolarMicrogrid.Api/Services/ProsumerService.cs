/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: ProsumerService.cs
 * Description: Registers Prosumer accounts and returns registration results.
 */

using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class ProsumerService
{
    private readonly IMongoCollection<User> _usersCollection;

    public ProsumerService(IMongoDatabase database)
    {
        // Access the users collection.
        _usersCollection = database.GetCollection<User>("Users");
    }

    public async Task<ProsumerRegistrationResult> RegisterAsync(ProsumerRegistrationRequest request)
    {
        // Validate and register a new Prosumer.
        var nic = request.Nic.Trim().ToUpperInvariant();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(nic) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return ProsumerRegistrationResult.Invalid("NIC, password, and full name are required.");
        }

        var existingNic = await _usersCollection.Find(user => user.Id == nic).AnyAsync();
        if (existingNic)
        {
            return ProsumerRegistrationResult.Conflict("A user with this NIC already exists.");
        }

        if (email is not null)
        {
            var existingEmail = await _usersCollection.Find(user => user.Email == email).AnyAsync();
            if (existingEmail)
            {
                return ProsumerRegistrationResult.Conflict("A user with this email address already exists.");
            }
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = nic,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = UserRoles.Prosumer,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            AccountStatus = AccountStatuses.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _usersCollection.InsertOneAsync(user);
        return ProsumerRegistrationResult.Created(ToResponse(user));
    }

    // Convert a user into a profile response.
    private static UserProfileResponse ToResponse(User user) => new()
    {
        Id = user.Id,
        Role = user.Role,
        FullName = user.FullName,
        Email = user.Email,
        Phone = user.Phone,
        AccountStatus = user.AccountStatus,
        CreatedAt = user.CreatedAt,
        UpdatedAt = user.UpdatedAt
    };
}

public sealed class ProsumerRegistrationResult
{
    private ProsumerRegistrationResult(UserProfileResponse? user, string? error, bool isConflict)
    {
        // Store the registration result.
        User = user;
        Error = error;
        IsConflict = isConflict;
    }

    public UserProfileResponse? User { get; }
    public string? Error { get; }
    public bool IsConflict { get; }
    public bool IsInvalid => Error is not null && !IsConflict;

    // Create a successful registration result.
    public static ProsumerRegistrationResult Created(UserProfileResponse user) => new(user, null, false);

    // Create a duplicate account result.
    public static ProsumerRegistrationResult Conflict(string error) => new(null, error, true);

    // Create an invalid registration result.
    public static ProsumerRegistrationResult Invalid(string error) => new(null, error, false);
}
