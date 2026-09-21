using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/nodes/{stationId}/slots")]
public sealed class EnergyBookingSlotsController : ControllerBase
{
    private readonly EnergyBookingSlotService _slotService;

    public EnergyBookingSlotsController(
        EnergyBookingSlotService slotService)
    {
        _slotService = slotService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSlots(string stationId)
    {
        return Ok(await _slotService.GetSlotsAsync(stationId));
    }
}