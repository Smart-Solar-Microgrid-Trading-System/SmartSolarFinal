using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class UserManagementService
{
    private readonly IMongoCollection<User> _usersCollection;

    public UserManagementService(IMongoDatabase database)
    {
        _usersCollection = database.GetCollection<User>("Users");
    }

    public async Task<UserManagementResult> CreateWebUserAsync(CreateWebUserRequest request)
    {
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

    public async Task<IReadOnlyList<UserProfileResponse>> GetPendingProsumersAsync()
    {
        return await GetProsumersAsync(AccountStatuses.Pending);
    }

    public async Task<IReadOnlyList<UserProfileResponse>> GetProsumersAsync(string? accountStatus = null)
    {
        var filter = Builders<User>.Filter.Eq(user => user.Role, UserRoles.Prosumer);
        if (!string.IsNullOrWhiteSpace(accountStatus))
        {
            filter &= Builders<User>.Filter.Eq(user => user.AccountStatus, accountStatus);
        }

        var users = await _usersCollection.Find(filter).SortBy(user => user.FullName)
            .ToListAsync();

        return users.Select(ToResponse).ToList();
    }

    public async Task<IReadOnlyList<UserProfileResponse>> GetWebUsersAsync()
    {
        var filter = Builders<User>.Filter.In(user => user.Role, new[] { UserRoles.Backoffice, UserRoles.GridOperator });
        var users = await _usersCollection.Find(filter).SortBy(user => user.FullName).ToListAsync();
        return users.Select(ToResponse).ToList();
    }

    public async Task<UserManagementResult> UpdateProsumerStatusAsync(string nic, UpdateProsumerStatusRequest request)
    {
        if (request.AccountStatus is not AccountStatuses.Active and not AccountStatuses.Deactivated)
        {
            return UserManagementResult.Invalid("AccountStatus must be Active or Deactivated.");
        }

        var user = await _usersCollection.Find(candidate =>
                candidate.Id == nic && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user is null)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }

        user.AccountStatus = request.AccountStatus;
        user.UpdatedAt = DateTime.UtcNow;
        await _usersCollection.ReplaceOneAsync(candidate => candidate.Id == nic, user);
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> GetUserAsync(string userId)
    {
        var user = await _usersCollection.Find(candidate => candidate.Id == userId).FirstOrDefaultAsync();
        return user is null
            ? UserManagementResult.NotFound("User not found.")
            : UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> UpdateProfileAsync(string userId, UpdateUserProfileRequest request)
    {
        var user = await _usersCollection.Find(candidate => candidate.Id == userId).FirstOrDefaultAsync();
        if (user is null)
        {
            return UserManagementResult.NotFound("User not found.");
        }

        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return UserManagementResult.Invalid("Full name is required.");
        }

        var email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim().ToLowerInvariant();
        if (email is not null && await _usersCollection.Find(candidate =>
                candidate.Email == email && candidate.Id != userId).AnyAsync())
        {
            return UserManagementResult.Conflict("A user with this email address already exists.");
        }

        user.FullName = request.FullName.Trim();
        user.Email = email;
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await _usersCollection.ReplaceOneAsync(candidate => candidate.Id == userId, user);
        return UserManagementResult.Success(ToResponse(user));
    }

    public async Task<UserManagementResult> DeactivateProsumerAsync(string userId)
    {
        var user = await _usersCollection.Find(candidate =>
                candidate.Id == userId && candidate.Role == UserRoles.Prosumer)
            .FirstOrDefaultAsync();
        if (user is null)
        {
            return UserManagementResult.NotFound("Prosumer not found.");
        }

        user.AccountStatus = AccountStatuses.Deactivated;
        user.UpdatedAt = DateTime.UtcNow;
        await _usersCollection.ReplaceOneAsync(candidate => candidate.Id == userId, user);
        return UserManagementResult.Success(ToResponse(user));
    }

    private static UserProfileResponse ToResponse(User user) => new()
    {
        Id = user.Id, Role = user.Role, FullName = user.FullName, Email = user.Email,
        Phone = user.Phone, AccountStatus = user.AccountStatus,
        CreatedAt = user.CreatedAt, UpdatedAt = user.UpdatedAt
    };
}

public sealed class UserManagementResult
{
    private UserManagementResult(UserProfileResponse? user, string? error, UserManagementFailure failure)
    {
        User = user;
        Error = error;
        Failure = failure;
    }

    public UserProfileResponse? User { get; }
    public string? Error { get; }
    public UserManagementFailure Failure { get; }

    public static UserManagementResult Success(UserProfileResponse user) => new(user, null, UserManagementFailure.None);
    public static UserManagementResult Invalid(string error) => new(null, error, UserManagementFailure.Invalid);
    public static UserManagementResult Conflict(string error) => new(null, error, UserManagementFailure.Conflict);
    public static UserManagementResult NotFound(string error) => new(null, error, UserManagementFailure.NotFound);
}

public enum UserManagementFailure { None, Invalid, Conflict, NotFound }
