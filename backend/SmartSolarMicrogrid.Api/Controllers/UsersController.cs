/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: UsersController.cs
 * Description: Handles web user administration and account operations.
 */

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
    private readonly ProsumerService _prosumerService;

    public UsersController(UserManagementService userManagementService, ProsumerService prosumerService)
    {
        // Store the services used for web accounts and Prosumer self-service operations.
        _userManagementService = userManagementService;
        _prosumerService = prosumerService;
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateWebUserRequest request)
    {
        // Create a Backoffice or Grid Operator account.
        UserManagementResult result;
        try
        {
            result = await _userManagementService.CreateWebUserAsync(request);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "A user with this username or email address already exists." });
        }

        switch (result.Failure)
        {
            case UserManagementFailure.Invalid:
                return BadRequest(new { error = result.Error });

            case UserManagementFailure.Conflict:
                return Conflict(new { error = result.Error });

            default:
                return CreatedAtAction(nameof(Create), result.User);
        }
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpGet]
    public async Task<IActionResult> GetWebUsers()
    {
        // Return all web users.
        var users = await _userManagementService.GetWebUsersAsync();
        return Ok(users);
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateWebUserStatus(string id, [FromBody] UpdateAccountStatusRequest request)
    {
        // Update the user's account status.
        if (id == GetCurrentUserId() && request.AccountStatus == AccountStatuses.Deactivated)
        {
            return BadRequest(new { error = "You cannot deactivate your own account." });
        }

        var result = await _userManagementService.UpdateWebUserStatusAsync(id, request);
        return ToUserResult(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        // Return the current user's account details.
        var result = await _userManagementService.GetUserAsync(GetCurrentUserId());
        return ToUserResult(result);
    }

    [Authorize(Roles = UserRoles.Backoffice + "," + UserRoles.GridOperator)]
    [HttpPatch("me/email")]
    public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest request)
    {
        // Change the authenticated web user's email address.
        try
        {
            return ToUserResult(await _userManagementService.ChangeEmailAsync(GetCurrentUserId(), request));
        }
        catch (MongoCommandException exception) when (exception.Code == 11000)
        {
            return Conflict(new { error = "This email address is already in use." });
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "This email address is already in use." });
        }
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateUserProfileRequest request)
    {
        // Update the authenticated Prosumer's profile.
        try
        {
            var result = await _prosumerService.UpdateOwnProfileAsync(GetCurrentUserId(), request);
            return ToUserResult(result);
        }
        catch (MongoCommandException exception) when (exception.Code == 11000)
        {
            return Conflict(new { error = "This email address is already in use." });
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "This email address is already in use." });
        }
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPost("me/deactivation-request")]
    public async Task<IActionResult> RequestDeactivation()
    {
        // Deactivate the authenticated Prosumer's account.
        var result = await _prosumerService.DeactivateProsumerAsync(GetCurrentUserId());
        return ToUserResult(result);
    }

    private string GetCurrentUserId()
    {
        // Read the authenticated user's identifier.
        return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }

    private IActionResult ToUserResult(UserManagementResult result)
    {
        // Convert a service result into an HTTP response.
        switch (result.Failure)
        {
            case UserManagementFailure.Invalid:
                return BadRequest(new { error = result.Error });

            case UserManagementFailure.Conflict:
                return Conflict(new { error = result.Error });

            case UserManagementFailure.NotFound:
                return NotFound(new { error = result.Error });

            default:
                return Ok(result.User);
        }
    }
}
