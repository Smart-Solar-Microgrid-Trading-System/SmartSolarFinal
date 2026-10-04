/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: ProsumerService.cs
 * Description: Manages Prosumer registration, profiles, account statuses, and deactivation.
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

        if (email != null)
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

    public async Task<IReadOnlyList<UserProfileResponse>> GetPendingProsumersAsync()
    {
        // Return all pending Prosumers.
        return await GetProsumersAsync(AccountStatuses.Pending);
    }

    public async Task<IReadOnlyList<UserProfileResponse>> GetProsumersAsync(string? accountStatus = null)
    {
        // Return Prosumers with an optional status filter.
        var filter = Builders<User>.Filter.Eq(user => user.Role, UserRoles.Prosumer);
        if (!string.IsNullOrWhiteSpace(accountStatus))
        {
            filter &= Builders<User>.Filter.Eq(user => user.AccountStatus, accountStatus);
        }

        var users = await _usersCollection.Find(filter).SortBy(user => user.FullName)
            .ToListAsync();

        return users.Select(ToResponse).ToList();
    }

    public async Task<UserManagementResult> UpdateProsumerStatusAsync(string nic, UpdateAccountStatusRequest request)
    {
        // Update a Prosumer's account status.
        if (request.AccountStatus != AccountStatuses.Active &&
            request.AccountStatus != AccountStatuses.Deactivated)
        {
            return UserManagementResult.Invalid("AccountStatus must be Active or Deactivated.");
        }

        var user = await _usersCollection.Find(candidate =>
                candidate.Id == nic && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user == null)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }

        user.AccountStatus = request.AccountStatus;
        user.SessionVersion = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _usersCollection.UpdateOneAsync(candidate =>
                candidate.Id == nic && candidate.Role == UserRoles.Prosumer,
            Builders<User>.Update
                .Set(candidate => candidate.AccountStatus, user.AccountStatus)
                .Set(candidate => candidate.SessionVersion, user.SessionVersion)
                .Set(candidate => candidate.UpdatedAt, user.UpdatedAt));
        if (result.MatchedCount == 0)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> UpdateOwnProfileAsync(string userId, UpdateUserProfileRequest request)
    {
        // Update the authenticated Prosumer's profile.
        var user = await _usersCollection.Find(candidate =>
                candidate.Id == userId && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user == null)
        {
            return UserManagementResult.NotFound("User not found.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return UserManagementResult.Invalid("Full name is required.");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (email != null && await _usersCollection.Find(candidate =>
                candidate.Email == email && candidate.Id != userId).AnyAsync())
        {
            return UserManagementResult.Conflict("A user with this email address already exists.");
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _usersCollection.UpdateOneAsync(candidate =>
                candidate.Id == userId && candidate.Role == UserRoles.Prosumer,
            Builders<User>.Update
                .Set(candidate => candidate.FullName, user.FullName)
                .Set(candidate => candidate.Email, user.Email)
                .Set(candidate => candidate.Phone, user.Phone)
                .Set(candidate => candidate.UpdatedAt, user.UpdatedAt));
        if (result.MatchedCount == 0)
        {
            return UserManagementResult.NotFound("User not found.");
        }
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> UpdateProsumerProfileAsync(string nic, UpdateUserProfileRequest request)
    {
        // Update a Prosumer's profile as Backoffice.
        var user = await _usersCollection.Find(candidate =>
                candidate.Id == nic && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user == null)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return UserManagementResult.Invalid("Full name is required.");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (email != null && await _usersCollection.Find(candidate =>
                candidate.Email == email && candidate.Id != nic).AnyAsync())
        {
            return UserManagementResult.Conflict("A user with this email address already exists.");
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _usersCollection.UpdateOneAsync(candidate =>
                candidate.Id == nic && candidate.Role == UserRoles.Prosumer,
            Builders<User>.Update
                .Set(candidate => candidate.FullName, user.FullName)
                .Set(candidate => candidate.Email, user.Email)
                .Set(candidate => candidate.Phone, user.Phone)
                .Set(candidate => candidate.UpdatedAt, user.UpdatedAt));
        if (result.MatchedCount == 0)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> DeactivateProsumerAsync(string userId)
    {
        // Deactivate a Prosumer account.
        var user = await _usersCollection.Find(candidate =>
                candidate.Id == userId && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user == null)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }

        user.AccountStatus = AccountStatuses.Deactivated;
        user.SessionVersion = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _usersCollection.UpdateOneAsync(candidate =>
                candidate.Id == userId && candidate.Role == UserRoles.Prosumer,
            Builders<User>.Update
                .Set(candidate => candidate.AccountStatus, user.AccountStatus)
                .Set(candidate => candidate.SessionVersion, user.SessionVersion)
                .Set(candidate => candidate.UpdatedAt, user.UpdatedAt));
        if (result.MatchedCount == 0)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }
        return UserManagementResult.Success(ToResponse(user));
    }

    private static UserProfileResponse ToResponse(User user)
    {
        // Convert a user into a profile response.
        return new UserProfileResponse
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
    public bool IsInvalid
    {
        get
        {
            return Error != null && !IsConflict;
        }
    }

    public static ProsumerRegistrationResult Created(UserProfileResponse user)
    {
        // Create a successful registration result.
        return new ProsumerRegistrationResult(user, null, false);
    }

    public static ProsumerRegistrationResult Conflict(string error)
    {
        // Create a duplicate account result.
        return new ProsumerRegistrationResult(null, error, true);
    }

    public static ProsumerRegistrationResult Invalid(string error)
    {
        // Create an invalid registration result.
        return new ProsumerRegistrationResult(null, error, false);
    }
}
