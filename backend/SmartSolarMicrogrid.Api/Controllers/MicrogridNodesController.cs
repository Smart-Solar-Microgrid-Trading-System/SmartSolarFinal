using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Services;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/nodes")]
public sealed class MicrogridNodesController : ControllerBase
{
    private readonly MicrogridNodeService _nodeService;

    public MicrogridNodesController(MicrogridNodeService nodeService) => _nodeService = nodeService;

    [HttpGet]
    public async Task<IActionResult> GetActiveNodes() => Ok(await _nodeService.GetActiveNodesAsync());
}
