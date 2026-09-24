using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("api/booking-slots")]
public class BookingSlotsController : ControllerBase
{
    private readonly BookingSlotService _bookingSlotService;

    public BookingSlotsController(BookingSlotService bookingSlotService)
    {
        _bookingSlotService = bookingSlotService;
    }

    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        // Get all active slots
        var slots = await _bookingSlotService.GetAllAsync();
        return Ok(slots);
    }

    [Authorize]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        // Get one slot
        var slot = await _bookingSlotService.GetByIdAsync(id);

        if (slot == null)
        {
            return NotFound(new { error = "Booking slot was not found." });
        }

        return Ok(slot);
    }

    [Authorize]
    [HttpGet("node/{nodeId}")]
    [HttpGet("/api/nodes/{nodeId}/slots")]
    public async Task<IActionResult> GetByNode(string nodeId, [FromQuery] string? status)
    {
        // Support both booking management and Prosumer reservation clients.
        var slots = await _bookingSlotService.GetByNodeAsync(nodeId, status);
        return Ok(slots);
    }

    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    [HttpPost]
    public async Task<IActionResult> Create(CreateBookingSlotRequest request)
    {
        // Create a new booking slot
        var result = await _bookingSlotService.CreateAsync(request);

        if (result.Error != null)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(result.Slot);
    }

    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(
        string id,
        UpdateBookingSlotRequest request)
    {
        // Update an existing booking slot
        var result = await _bookingSlotService.UpdateAsync(id, request);

        if (result.Error != null)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(result.Slot);
    }

    [Authorize(Roles = $"{UserRoles.Backoffice},{UserRoles.GridOperator}")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        // Deactivate the booking slot
        var result = await _bookingSlotService.DeleteAsync(id);

        if (!result.Success)
        {
            return BadRequest(new { error = result.Error });
        }

        return Ok(new
        {
            message = "Booking slot removed successfully."
        });
    }
}
