/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: AuthController.cs
 * Description: Handling of login and authenticated password change requests.
 */

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        // Storing the authentication service used by this controller.
        _authService = authService;
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        // Changing the password for the authenticated user.
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
        {
            return Unauthorized();
        }

        var error = await _authService.ChangePasswordAsync(userId, request);
        if (error == null)
        {
            return Ok(new { message = "Password changed. Please sign in again." });
        }

        return BadRequest(new { error });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Authenticating the account and return the login result.
        var response = await _authService.LoginAsync(request);

        if (response.IsUnauthorized)
        {
            return Unauthorized(new { error = response.Error });
        }

        if (response.IsForbidden)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { error = response.Error });
        }

        return Ok(response.Response);
    }
}
