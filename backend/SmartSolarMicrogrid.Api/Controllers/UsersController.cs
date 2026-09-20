using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;
using System.Security.Claims;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController : ControllerBase
{
    private readonly UserManagementService _userManagementService;

    public UsersController(UserManagementService userManagementService) => _userManagementService = userManagementService;

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebUserRequest request)
    {
        UserManagementResult result;
        try
        {
            result = await _userManagementService.CreateWebUserAsync(request);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "A user with this username or email address already exists." });
        }

        return result.Failure switch
        {
            UserManagementFailure.Invalid => BadRequest(new { error = result.Error }),
            UserManagementFailure.Conflict => Conflict(new { error = result.Error }),
            _ => CreatedAtAction(nameof(Create), result.User)
        };
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpGet]
    public async Task<IActionResult> GetWebUsers() => Ok(await _userManagementService.GetWebUsersAsync());

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var result = await _userManagementService.GetUserAsync(GetCurrentUserId());
        return ToUserResult(result);
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserProfileRequest request)
    {
        var result = await _userManagementService.UpdateProfileAsync(GetCurrentUserId(), request);
        return ToUserResult(result);
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPost("me/deactivation-request")]
    public async Task<IActionResult> RequestDeactivation()
    {
        var result = await _userManagementService.DeactivateProsumerAsync(GetCurrentUserId());
        return ToUserResult(result);
    }

    private string GetCurrentUserId() => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    private IActionResult ToUserResult(UserManagementResult result) => result.Failure switch
    {
        UserManagementFailure.Invalid => BadRequest(new { error = result.Error }),
        UserManagementFailure.Conflict => Conflict(new { error = result.Error }),
        UserManagementFailure.NotFound => NotFound(new { error = result.Error }),
        _ => Ok(result.User)
    };
}
