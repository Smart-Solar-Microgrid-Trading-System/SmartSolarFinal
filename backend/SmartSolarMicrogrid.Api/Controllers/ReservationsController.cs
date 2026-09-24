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
[Authorize(Policy = UserRoles.Prosumer)]
[Route("api/reservations")]
public sealed class ReservationsController : ControllerBase
{
    private readonly ReservationService _reservationService;

    public ReservationsController(ReservationService reservationService)
    {
        // Retain the reservation service supplied through dependency injection.
        _reservationService = reservationService;
    }

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
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        // List only reservations owned by the authenticated Prosumer.
        return Ok(await _reservationService.GetAllByProsumerAsync(GetCurrentUserId(), cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id, CancellationToken cancellationToken)
    {
        // Return a reservation only when it belongs to the authenticated Prosumer.
        var result = await _reservationService.GetByIdAsync(id, GetCurrentUserId(), cancellationToken);
        return result.Failure == ReservationFailure.None ? Ok(result.Reservation) : ToFailureResult(result);
    }

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
