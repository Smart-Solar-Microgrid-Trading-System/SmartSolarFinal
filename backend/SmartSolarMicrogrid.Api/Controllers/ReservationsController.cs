using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly ReservationQueryService _reservationService;

    public ReservationsController(ReservationQueryService reservationService)
    {
        _reservationService = reservationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] ReservationFilterRequest request)
    {
        // Get bookings with the selected filters
        var reservations = await _reservationService.GetAllAsync(
            request,
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        // Get current bookings
        var reservations = await _reservationService.GetCurrentAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        // Get bookings waiting for approval
        var reservations = await _reservationService.GetPendingAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        // Get previous bookings
        var reservations = await _reservationService.GetHistoryAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        // Get one reservation
        var reservation = await _reservationService.GetByIdAsync(
            id,
            GetUserId(),
            GetUserRole());

        if (reservation == null)
        {
            return NotFound(new
            {
                error = "Reservation was not found."
            });
        }

        return Ok(reservation);
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }

    private string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)!;
    }
}