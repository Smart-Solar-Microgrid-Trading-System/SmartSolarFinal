/*
 * Component: Energy Reservation Management
 * File: ReservationsController.cs
 * Purpose: Exposes authorized reservation query, create, update, and soft-cancellation endpoints.
 */
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
[Route("api/reservations")]
public class ReservationsController : ControllerBase
{
    private readonly ReservationQueryService _reservationService;
    private readonly ReservationCommandService _reservationCommands;

    public ReservationsController(ReservationQueryService reservationService, ReservationCommandService reservationCommands)
    {
        // Save the services used by the reservation endpoints.
        _reservationService = reservationService;
        _reservationCommands = reservationCommands;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest request)
    {
        // Create a Pending reservation for the selected active Prosumer.
        var result = await _reservationCommands.CreateAsync(request);
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        var reservation = await _reservationService.GetByIdAsync(result.ReservationId!, GetUserId(), GetUserRole());
        return CreatedAtAction(nameof(GetById), new { id = result.ReservationId }, reservation);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] ReservationFilterRequest request)
    {
        // Return reservations that match the selected filters.
        var reservations = await _reservationService.GetAllAsync(
            request,
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        // Return current Pending and Approved reservations.
        var reservations = await _reservationService.GetCurrentAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        // Return reservations that are waiting for approval.
        var reservations = await _reservationService.GetPendingAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        // Return reservations that belong in the booking history.
        var reservations = await _reservationService.GetHistoryAsync(
            GetUserId(),
            GetUserRole());

        return Ok(reservations);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        // Return the requested reservation and its display details.
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
        // Update the selected slot and energy amount after applying reservation rules.
        var result = await _reservationCommands.UpdateAsync(id, request);
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        return Ok(await _reservationService.GetByIdAsync(id, GetUserId(), GetUserRole()));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(string id)
    {
        // Soft-cancel the reservation and return the updated record.
        var result = await _reservationCommands.CancelAsync(id);
        if (result.Failure != ReservationCommandFailure.None) return ToFailureResult(result);
        return Ok(await _reservationService.GetByIdAsync(id, GetUserId(), GetUserRole()));
    }

    private string GetUserId()
    {
        // Read the current user's identifier from the access token.
        return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }

    private string GetUserRole()
    {
        // Read the current user's role from the access token.
        return User.FindFirstValue(ClaimTypes.Role)!;
    }

    private IActionResult ToFailureResult(ReservationCommandResult result)
    {
        // Return the HTTP response that matches the service error.
        return result.Failure switch
        {
            ReservationCommandFailure.Invalid => BadRequest(new { error = result.Error }),
            ReservationCommandFailure.NotFound => NotFound(new { error = result.Error }),
            ReservationCommandFailure.Conflict => Conflict(new { error = result.Error }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { error = "The reservation request could not be completed." })
        };
    }
}
