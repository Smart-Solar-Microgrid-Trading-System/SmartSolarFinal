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
        _database = database;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (user.Identity?.IsAuthenticated == true)
        {
            var userId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userId != null)
            {
                var usersCollection = _database.GetCollection<User>("Users");
                var dbUser = await usersCollection.Find(u => u.Id == userId).FirstOrDefaultAsync();

                if (dbUser == null)
                {
                    context.Result = new UnauthorizedResult();
                    return;
                }

                if (dbUser.AccountStatus != "Active")
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
