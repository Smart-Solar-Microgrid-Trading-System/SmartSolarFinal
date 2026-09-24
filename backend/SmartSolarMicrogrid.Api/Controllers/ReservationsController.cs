using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly ReservationQueryService _reservationService;
    private readonly ReservationCommandService _reservationCommands;

    public ReservationsController(ReservationQueryService reservationService, ReservationCommandService reservationCommands)
    {
        _reservationService = reservationService;
        _reservationCommands = reservationCommands;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        var result = await _reservationCommands.CreateAsync(request, GetUserId(), GetUserRole());
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        var reservation = await _reservationService.GetByIdAsync(result.ReservationId!, GetUserId(), GetUserRole());
        return CreatedAtAction(nameof(GetById), new { id = result.ReservationId }, reservation);
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

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateReservationRequest request)
    {
        var result = await _reservationCommands.UpdateAsync(id, request, GetUserId(), GetUserRole());
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        return Ok(await _reservationService.GetByIdAsync(id, GetUserId(), GetUserRole()));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(string id)
    {
        var result = await _reservationCommands.CancelAsync(id, GetUserId(), GetUserRole());
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        return Ok(await _reservationService.GetByIdAsync(id, GetUserId(), GetUserRole()));
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }

    private string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)!;
    }

    private IActionResult ToFailureResult(ReservationCommandResult result) => result.Failure switch
    {
        ReservationCommandFailure.Invalid => BadRequest(new { error = result.Error }),
        ReservationCommandFailure.NotFound => NotFound(new { error = result.Error }),
        ReservationCommandFailure.Conflict => Conflict(new { error = result.Error }),
        _ => StatusCode(StatusCodes.Status500InternalServerError, new { error = "The reservation request could not be completed." })
    };
}
