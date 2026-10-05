/*
 * Student Name: Thilakaratne A.A.S.M.
 * Component: Energy Transaction Management
 * File Name: TransactionsController.cs
 * Description: Defines API endpoints for generating transaction QR codes, verifying transaction details, and finalizing energy transfers.
 */


using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartSolarMicrogrid.Api.Models.Dtos;
using SmartSolarMicrogrid.Api.Services;
using System.Security.Claims;

namespace SmartSolarMicrogrid.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/transactions")]
public sealed class TransactionsController : ControllerBase
{
    private readonly TransactionService _transactionService;

    public TransactionsController(TransactionService transactionService)
    {
        _transactionService = transactionService;
    }

    /*
     * PROSUMER
     *
     * Generate a transaction QR after the reservation
     * has been approved.
     */
    [HttpPost("qr")]
    public async Task<IActionResult> GenerateQr(
        [FromBody] GenerateTransactionQrRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ReservationId))
        {
            return BadRequest(new
            {
                error = "Reservation ID is required."
            });
        }

        try
        {
            var result = await _transactionService.GenerateQrAsync(
                request.ReservationId,
                GetUserId(),
                GetUserRole());

            if (result == null)
            {
                return NotFound(new
                {
                    error = "Reservation was not found."
                });
            }

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                error = ex.Message
            });
        }
    }

    /*
     * GRID OPERATOR
     *
     * Verify the QR against the server.
     */
    [HttpPost("verify")]
    [Authorize(Roles = "GridOperator")]
    public async Task<IActionResult> Verify(
        [FromBody] VerifyTransactionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TransactionToken))
        {
            return BadRequest(new
            {
                error = "Transaction token is required."
            });
        }

        try
        {
            var result = await _transactionService.VerifyAsync(
                request.TransactionToken,
                GetUserId(),
                GetUserRole());

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                valid = false,
                error = ex.Message
            });
        }
    }

    /*
     * GRID OPERATOR
     *
     * Finalize the actual energy transfer.
     */
    [HttpPost("finalize")]
    [Authorize(Roles = "GridOperator")]
    public async Task<IActionResult> Finalize(
        [FromBody] FinalizeTransactionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TransactionToken))
        {
            return BadRequest(new
            {
                error = "Transaction token is required."
            });
        }

        try
        {
            var result = await _transactionService.FinalizeAsync(
                request.TransactionToken,
                GetUserId(),
                GetUserRole());

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                success = false,
                error = ex.Message
            });
        }
    }

    private string GetUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException(
                "User ID is missing from the access token.");
    }

    private string GetUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)
            ?? throw new UnauthorizedAccessException(
                "User role is missing from the access token.");
    }
}