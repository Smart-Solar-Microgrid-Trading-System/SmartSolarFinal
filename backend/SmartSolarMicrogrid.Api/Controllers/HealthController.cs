using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        // Report API availability only; database connectivity is not checked here.
        return Ok(new { status = "ok", service = "SmartSolarMicrogrid.Api" });
    }

    [HttpGet("ready")]
    public async Task<IActionResult> Ready(
        [FromServices] IMongoDatabase database,
        CancellationToken cancellationToken)
    {
        // Ping MongoDB without creating data; bound the check to five seconds.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(5));
        Response.Headers.CacheControl = "no-store";

        try
        {
            await database.RunCommandAsync<BsonDocument>(
                new BsonDocument("ping", 1), cancellationToken: timeout.Token);
            return Ok(new { status = "ready", database = "reachable" });
        }
        catch (Exception exception) when (
            !cancellationToken.IsCancellationRequested &&
            exception is MongoException or TimeoutException or OperationCanceledException)
        {
            // Report dependency failure without exposing connection details.
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { status = "not_ready", database = "unreachable" });
        }
    }
}
