using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models.Dtos;
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
   // public async Task<IActionResult> GetActiveNodes() => Ok(await _nodeService.GetActiveNodesAsync());
    public async Task<ActionResult<List<MicrogridNodeResponse>>> GetNodes()
    {
        return Ok(await _nodeService.GetAllNodesAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MicrogridNodeResponse>> GetNode(string id)
    {
        var node = await _nodeService.GetNodeByIdAsync(id);

        if (node == null)
        {
            return NotFound(new{ message = "Microgrid node not found."});
        }

        return Ok(node);
    }

    [HttpPost]
    public async Task<ActionResult<MicrogridNodeResponse>> CreateNode([FromBody] CreateMicrogridNodeRequest request)
    {
        try
        {
            var node = await _nodeService.CreateNodeAsync(request);

            return CreatedAtAction( nameof(GetNode), new { id = node.Id }, node);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new {   message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<MicrogridNodeResponse>> UpdateNode(string id,[FromBody] UpdateMicrogridNodeRequest request)
    {
        try
        {
            var node = await _nodeService.UpdateNodeAsync( id, request);

            if (node == null)
            {
                return NotFound(new {  message = "Microgrid node not found."});
            }

            return Ok(node);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("{id}/deactivate")]
    public async Task<IActionResult> DeactivateNode(string id)
    {
        try
        {
            var deactivated =
                await _nodeService.DeactivateNodeAsync(id);

            if (!deactivated)
            {
                return NotFound(new
                { message = "Microgrid node was not found." });
            }

            return Ok(new
            { message = "Microgrid node deactivated successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            { message = ex.Message});
        }
    }
}