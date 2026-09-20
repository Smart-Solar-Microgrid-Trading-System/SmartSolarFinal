using Microsoft.AspNetCore.Mvc;
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
