/*
 * Energy Reservation Management
 * Exposes Prosumer-owned reservation creation, read, update, and soft cancellation endpoints.
 */
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
public sealed class ReservationsController : ControllerBase
{
    private readonly ReservationService _reservationService;
    private readonly ReservationQueryService _queryService;

    public ReservationsController(ReservationService reservationService, ReservationQueryService queryService)
    {
        // Retain the reservation service supplied through dependency injection.
        _reservationService = reservationService;
        _queryService = queryService;
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateReservationRequest request,
        CancellationToken cancellationToken)
    {
        // Create a reservation for the authenticated Prosumer, never a body-supplied owner.
        var result = await _reservationService.CreateAsync(GetCurrentUserId(), request, cancellationToken);
        return result.Failure == ReservationFailure.None
            ? CreatedAtAction(nameof(GetById), new { id = result.Reservation!.Id }, result.Reservation)
            : ToFailureResult(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] ReservationFilterRequest request)
    {
        return Ok(await _queryService.GetAllAsync(request, GetCurrentUserId(), GetCurrentUserRole()));
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent() =>
        Ok(await _queryService.GetCurrentAsync(GetCurrentUserId(), GetCurrentUserRole()));

    [HttpGet("pending")]
    public async Task<IActionResult> GetPending() =>
        Ok(await _queryService.GetPendingAsync(GetCurrentUserId(), GetCurrentUserRole()));

    [HttpGet("history")]
    public async Task<IActionResult> GetHistory() =>
        Ok(await _queryService.GetHistoryAsync(GetCurrentUserId(), GetCurrentUserRole()));

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var reservation = await _queryService.GetByIdAsync(id, GetCurrentUserId(), GetCurrentUserRole());
        return reservation is null ? NotFound(new { error = "Reservation was not found." }) : Ok(reservation);
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        string id,
        [FromBody] UpdateReservationRequest request,
        CancellationToken cancellationToken)
    {
        // Apply reservation changes under ownership, status, and twelve-hour checks.
        var result = await _reservationService.UpdateAsync(id, GetCurrentUserId(), request, cancellationToken);
        return result.Failure == ReservationFailure.None ? Ok(result.Reservation) : ToFailureResult(result);
    }

    [Authorize(Policy = UserRoles.Prosumer)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(string id, CancellationToken cancellationToken)
    {
        // Soft-cancel the authenticated Prosumer's reservation and return its summary.
        var result = await _reservationService.CancelAsync(id, GetCurrentUserId(), cancellationToken);
        return result.Failure == ReservationFailure.None ? Ok(result.Reservation) : ToFailureResult(result);
    }

    private string GetCurrentUserId()
    {
        // Read the immutable user identifier issued by the existing authentication system.
        return User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    }

    private string GetCurrentUserRole() => User.FindFirstValue(ClaimTypes.Role)!;

    private IActionResult ToFailureResult(ReservationResult result)
    {
        // Translate categorized service failures into the project's established HTTP responses.
        return result.Failure switch
        {
            ReservationFailure.Invalid => BadRequest(new { error = result.Error }),
            ReservationFailure.NotFound => NotFound(new { error = result.Error }),
            ReservationFailure.Conflict => Conflict(new { error = result.Error }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { error = "The reservation request could not be completed." })
        };
    }
}
