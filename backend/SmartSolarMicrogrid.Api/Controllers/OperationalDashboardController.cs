using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/dashboard/operations")]
public class OperationalDashboardController : ControllerBase
{
    private readonly ReservationQueryService _reservationService;

    public OperationalDashboardController(
        ReservationQueryService reservationService)
    {
        _reservationService = reservationService;
    }

    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    [HttpGet]
    public async Task<IActionResult> GetDashboard()
    {
        // Get the live booking counts for the dashboard
        var dashboard = await _reservationService.GetDashboardAsync();

        return Ok(dashboard);
    }
}