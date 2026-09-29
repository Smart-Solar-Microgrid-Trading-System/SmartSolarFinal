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
        _authService = authService;
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();
        var error = await _authService.ChangePasswordAsync(userId, request);
        return error is null
            ? Ok(new { message = "Password changed. Please sign in again." })
            : BadRequest(new { error });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
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
