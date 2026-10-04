/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: AccountStatusFilter.cs
 * Description: Checking account status and session validation for authenticated requests.
 */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using System.Security.Claims;

namespace SmartSolarMicrogrid.Api.Filters;

public class AccountStatusFilter : IAsyncAuthorizationFilter
{
    private readonly IMongoDatabase _database;

    public AccountStatusFilter(IMongoDatabase database)
    {
        // Store the database used for account checks.
        _database = database;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        // Check the current account before allowing the request.
        var user = context.HttpContext.User;

        if (user.Identity?.IsAuthenticated == true)
        {
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId != null)
            {
                var usersCollection = _database.GetCollection<User>("Users");
                var dbUser = await usersCollection.Find(u => u.Id == userId).FirstOrDefaultAsync();

                if (dbUser == null || (user.FindFirst("session_version")?.Value ?? "") != dbUser.SessionVersion)
                {
                    context.Result = new ObjectResult(new
                    {
                        error = "Session is no longer valid. Please sign in again."
                    })
                    {
                        StatusCode = StatusCodes.Status401Unauthorized
                    };
                    return;
                }

                if (dbUser.AccountStatus != AccountStatuses.Active)
                {
                    context.Result = new ObjectResult(new { error = $"Account is {dbUser.AccountStatus}" })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                    return;
                }
            }
        }
    }
}
