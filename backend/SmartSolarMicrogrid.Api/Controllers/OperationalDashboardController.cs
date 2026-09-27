
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class OperationalDashboardController : ControllerBase
{
    private readonly ReservationQueryService _reservationQueryService;

    public OperationalDashboardController(
        ReservationQueryService reservationQueryService)
    {
        // Initializes the reservation query service used by dashboard endpoints.
        _reservationQueryService = reservationQueryService;
    }

    [HttpGet("operations")]
    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    public async Task<IActionResult> GetOperationalDashboard()
    {
        // Returns system-wide reservation statistics for Backoffice and Grid Operator users.
        var dashboard =
            await _reservationQueryService.GetDashboardAsync();

        return Ok(dashboard);
    }

    [HttpGet("prosumer")]
    [Authorize(Roles = UserRoles.Prosumer)]
    public async Task<IActionResult> GetProsumerDashboard()
    {
        // Returns reservation statistics belonging only to the logged-in Prosumer.
        var prosumerNic =
            User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(prosumerNic))
        {
            return Unauthorized(
                new
                {
                    message = "Unable to identify the logged-in Prosumer."
                });
        }

        var dashboard =
            await _reservationQueryService
                .GetProsumerDashboardAsync(prosumerNic);

        return Ok(dashboard);
    }
}