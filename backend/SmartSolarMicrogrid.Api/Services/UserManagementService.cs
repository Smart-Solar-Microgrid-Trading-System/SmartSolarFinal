/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: UserManagementService.cs
 * Description: Manages web accounts and provides shared account profile lookups.
 */

using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class UserManagementService
{
    private readonly IMongoCollection<User> _usersCollection;

    public UserManagementService(IMongoDatabase database)
    {
        // Access the users collection.
        _usersCollection = database.GetCollection<User>("Users");
    }

    public async Task<UserManagementResult> ChangeEmailAsync(string userId, ChangeEmailRequest request)
    {
        // Validate and change a web user's email address.
        var user = await _usersCollection.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user is null) return UserManagementResult.NotFound("User not found.");
        if (user.AccountStatus != AccountStatuses.Active || user.Role is not (UserRoles.Backoffice or UserRoles.GridOperator))
            return UserManagementResult.Invalid("Account cannot update its email.");
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return UserManagementResult.Invalid("Current password is incorrect.");
        var email = request.NewEmail.Trim().ToLowerInvariant();
        if (email == user.Email) return UserManagementResult.Invalid("Enter a different email address.");
        if (await _usersCollection.Find(u => u.Email == email && u.Id != userId).AnyAsync())
            return UserManagementResult.Conflict("This email address is already in use.");
        var updated = await _usersCollection.FindOneAndUpdateAsync(
            u => u.Id == userId && u.PasswordHash == user.PasswordHash && u.AccountStatus == AccountStatuses.Active,
            Builders<User>.Update.Set(u => u.Email, email).Set(u => u.UpdatedAt, DateTime.UtcNow),
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After });
        return updated is null ? UserManagementResult.Invalid("Account changed. Please sign in again and retry.")
            : UserManagementResult.Success(ToResponse(updated));
    }

    public async Task<UserManagementResult> CreateWebUserAsync(CreateWebUserRequest request)
    {
        // Validate and create a web user account.
        var identifier = request.Identifier.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return UserManagementResult.Invalid("Identifier, password, and full name are required.");
        }

        if (request.Role is not UserRoles.Backoffice and not UserRoles.GridOperator)
        {
            return UserManagementResult.Invalid("Role must be Backoffice or GridOperator.");
        }

        if (await _usersCollection.Find(user => user.Id == identifier).AnyAsync())
        {
            return UserManagementResult.Conflict("A user with this username already exists.");
        }

        if (email is not null && await _usersCollection.Find(user => user.Email == email).AnyAsync())
        {
            return UserManagementResult.Conflict("A user with this email address already exists.");
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = identifier,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            FullName = request.FullName.Trim(),
            Email = email,
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            AccountStatus = AccountStatuses.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _usersCollection.InsertOneAsync(user);
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<IReadOnlyList<UserProfileResponse>> GetWebUsersAsync()
    {
        // Return all Backoffice and Grid Operator accounts.
        var filter = Builders<User>.Filter.In(user => user.Role, new[] { UserRoles.Backoffice, UserRoles.GridOperator });
        var users = await _usersCollection.Find(filter).SortBy(user => user.FullName).ToListAsync();
        return users.Select(ToResponse).ToList();
    }

    public async Task<UserManagementResult> UpdateWebUserStatusAsync(string id, UpdateAccountStatusRequest request)
    {
        // Update a web user's account status.
        if (request.AccountStatus is not AccountStatuses.Active and not AccountStatuses.Deactivated)
        {
            return UserManagementResult.Invalid("AccountStatus must be Active or Deactivated.");
        }

        var user = await _usersCollection.Find(candidate =>
                candidate.Id == id &&
                (candidate.Role == UserRoles.Backoffice || candidate.Role == UserRoles.GridOperator))
            .FirstOrDefaultAsync();
        if (user is null)
        {
            return UserManagementResult.NotFound("Web user not found.");
        }

        user.AccountStatus = request.AccountStatus;
        user.SessionVersion = Guid.NewGuid().ToString("N");
        user.UpdatedAt = DateTime.UtcNow;
        var result = await _usersCollection.UpdateOneAsync(candidate =>
                candidate.Id == id &&
                (candidate.Role == UserRoles.Backoffice || candidate.Role == UserRoles.GridOperator),
            Builders<User>.Update
                .Set(candidate => candidate.AccountStatus, user.AccountStatus)
                .Set(candidate => candidate.SessionVersion, user.SessionVersion)
                .Set(candidate => candidate.UpdatedAt, user.UpdatedAt));
        if (result.MatchedCount == 0)
        {
            return UserManagementResult.NotFound("Web user not found.");
        }
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> GetUserAsync(string userId)
    {
        // Return a user by identifier.
        var user = await _usersCollection.Find(candidate => candidate.Id == userId).FirstOrDefaultAsync();
        return user is null
            ? UserManagementResult.NotFound("User not found.")
            : UserManagementResult.Success(ToResponse(user));
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

public sealed class UserManagementResult
{
    private UserManagementResult(UserProfileResponse? user, string? error, UserManagementFailure failure)
    {
        // Store the user management result.
        User = user;
        Error = error;
        Failure = failure;
    }

    public UserProfileResponse? User { get; }
    public string? Error { get; }
    public UserManagementFailure Failure { get; }

    // Create a successful result.
    public static UserManagementResult Success(UserProfileResponse user) => new(user, null, UserManagementFailure.None);

    // Create an invalid request result.
    public static UserManagementResult Invalid(string error) => new(null, error, UserManagementFailure.Invalid);

    // Create a conflicting-data result.
    public static UserManagementResult Conflict(string error) => new(null, error, UserManagementFailure.Conflict);

    // Create a missing-user result.
    public static UserManagementResult NotFound(string error) => new(null, error, UserManagementFailure.NotFound);
}

public enum UserManagementFailure { None, Invalid, Conflict, NotFound }
