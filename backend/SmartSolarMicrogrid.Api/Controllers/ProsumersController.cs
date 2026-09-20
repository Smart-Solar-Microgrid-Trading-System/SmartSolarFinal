using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/prosumers")]
public sealed class ProsumersController : ControllerBase
{
    private readonly ProsumerService _prosumerService;
    private readonly UserManagementService _userManagementService;

    public ProsumersController(ProsumerService prosumerService, UserManagementService userManagementService)
    {
        _prosumerService = prosumerService;
        _userManagementService = userManagementService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] ProsumerRegistrationRequest request)
    {
        ProsumerRegistrationResult result;
        try
        {
            result = await _prosumerService.RegisterAsync(request);
        }
        catch (MongoWriteException exception) when (exception.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new { error = "A user with this NIC or email address already exists." });
        }

        if (result.IsConflict)
        {
            return Conflict(new { error = result.Error });
        }

        if (result.IsInvalid)
        {
            return BadRequest(new { error = result.Error });
        }

        return CreatedAtAction(nameof(Register), result.User);
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpGet]
    public async Task<IActionResult> GetByStatus([FromQuery] string? status)
    {
        if (status is not null && status is not AccountStatuses.Pending and not AccountStatuses.Active and not AccountStatuses.Deactivated)
        {
            return BadRequest(new { error = "Status must be Pending, Active, or Deactivated." });
        }

        return Ok(await _userManagementService.GetProsumersAsync(status));
    }

    [Authorize(Policy = UserRoles.Backoffice)]
    [HttpPatch("{nic}/status")]
    public async Task<IActionResult> UpdateStatus(string nic, [FromBody] UpdateProsumerStatusRequest request)
    {
        var result = await _userManagementService.UpdateProsumerStatusAsync(nic, request);
        return result.Failure switch
        {
            UserManagementFailure.Invalid => BadRequest(new { error = result.Error }),
            UserManagementFailure.NotFound => NotFound(new { error = result.Error }),
            _ => Ok(result.User)
        };
    }
}
