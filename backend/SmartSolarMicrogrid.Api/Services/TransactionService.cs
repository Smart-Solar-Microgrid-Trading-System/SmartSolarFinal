using System.Security.Cryptography;
using System.Text;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class TransactionService
{
    private readonly IMongoCollection<EnergyTransaction> _transactions;
    private readonly ReservationQueryService _reservationService;

    public TransactionService(
        IMongoDatabase database,
        ReservationQueryService reservationService)
    {
        _transactions =
            database.GetCollection<EnergyTransaction>(
                "EnergyTransactions");

        _reservationService = reservationService;
    }

    public async Task<TransactionQrResponse?> GenerateQrAsync(
    string reservationId,
    string userId,
    string role)
    {
        var now =
            DateTime.UtcNow;

        // ---------------------------------------------------------
        // 1. Get the reservation
        // ---------------------------------------------------------

        var reservation =
            await _reservationService.GetByIdAsync(
                reservationId,
                userId,
                role);

        if (reservation == null)
        {
            return null;
        }


        // ---------------------------------------------------------
        // 2. Reservation must be approved
        // ---------------------------------------------------------

        if (!string.Equals(
                reservation.Status,
                "Approved",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "Only approved reservations can generate a transaction QR.");
        }


        // ---------------------------------------------------------
        // 3. Check whether an active QR already exists
        // ---------------------------------------------------------

        var existing =
            await _transactions
                .Find(x =>
                    x.ReservationId == reservationId &&
                    (x.Status == "ISSUED" ||
                     x.Status == "VERIFIED") &&
                    x.ExpiresAt > now)
                .FirstOrDefaultAsync();

        if (existing != null)
        {
            if (existing.Status == "VERIFIED")
            {
                throw new InvalidOperationException(
                    "This transaction QR has already been verified and must be finalized.");
            }

            existing.Status = "SUPERSEDED";
            existing.UpdatedAt = now;

            await _transactions.ReplaceOneAsync(
                x => x.Id == existing.Id,
                existing);
        }


        // ---------------------------------------------------------
        // 4. Generate a secure random transaction token
        // ---------------------------------------------------------

        var tokenBytes =
            RandomNumberGenerator.GetBytes(32);

        var transactionToken =
            Convert.ToBase64String(tokenBytes);


        // ---------------------------------------------------------
        // 5. Store only the hash in MongoDB
        // ---------------------------------------------------------

        var tokenHash =
            HashToken(transactionToken);


        // ---------------------------------------------------------
        // 6. QR expires after 15 minutes
        // ---------------------------------------------------------

        var expiresAt =
            now.AddMinutes(15);


        // ---------------------------------------------------------
        // 7. Create EnergyTransaction
        // ---------------------------------------------------------

        var transaction = new EnergyTransaction
        {
            Id = Guid.NewGuid().ToString(),

            ReservationId = reservation.Id,

            ProsumerId = userId,

            NodeId = reservation.NodeId,

            SlotId = reservation.SlotId,

            TransactionTokenHash = tokenHash,

            Status = "ISSUED",

            CreatedAt = now,

            UpdatedAt = now,

            ExpiresAt = expiresAt
        };


        // ---------------------------------------------------------
        // 8. Save EnergyTransaction to MongoDB
        // ---------------------------------------------------------

        await _transactions.InsertOneAsync(transaction);


        // ---------------------------------------------------------
        // 9. Create the QR payload
        // ---------------------------------------------------------

        var qrPayload =
            $"SMARTSOLAR|TX|{transactionToken}";


        // ---------------------------------------------------------
        // 10. Return QR information to Android
        // ---------------------------------------------------------

        return new TransactionQrResponse
        {
            ReservationId = reservation.Id,

            TransactionToken = transactionToken,

            QrPayload = qrPayload,

            ExpiresAt = expiresAt,

            Status = transaction.Status
        };
    }

    public async Task<TransactionVerificationResponse> VerifyAsync(
    string transactionToken,
    string operatorId,
    string operatorRole)
    {
        if (string.IsNullOrWhiteSpace(transactionToken))
        {
            throw new InvalidOperationException(
                "Transaction token is required.");
        }

        // ---------------------------------------------------------
        // 1. Hash the supplied token
        // ---------------------------------------------------------

        var hash = HashToken(transactionToken);

        // ---------------------------------------------------------
        // 2. Find the transaction
        // ---------------------------------------------------------

        var transaction = await _transactions
            .Find(x => x.TransactionTokenHash == hash)
            .FirstOrDefaultAsync();

        if (transaction == null)
        {
            throw new InvalidOperationException(
                "Invalid transaction QR.");
        }

        // ---------------------------------------------------------
        // 3. Check expiration
        // ---------------------------------------------------------

        if (transaction.ExpiresAt < DateTime.UtcNow)
        {
            throw new InvalidOperationException(
                "This transaction QR has expired.");
        }

        // ---------------------------------------------------------
        // 4. Check transaction status
        // ---------------------------------------------------------

        if (transaction.Status == "COMPLETED")
        {
            throw new InvalidOperationException(
                "This transaction has already been completed.");
        }

        if (transaction.Status == "VERIFIED")
        {
            return new TransactionVerificationResponse
            {
                Valid = true,
                TransactionToken = transactionToken,
                ReservationId = transaction.ReservationId,
                Status = "VERIFIED",
                Message = "Transaction QR is already verified."
            };
        }

        if (transaction.Status != "ISSUED")
        {
            throw new InvalidOperationException(
                $"Transaction cannot be verified because its current status is '{transaction.Status}'.");
        }

        // ---------------------------------------------------------
        // 5. Get reservation
        // ---------------------------------------------------------

        var reservation = await _reservationService.GetByIdAsync(
            transaction.ReservationId,
            operatorId,
            operatorRole);

        if (reservation == null)
        {
            throw new InvalidOperationException(
                "The reservation could not be found.");
        }

        // ---------------------------------------------------------
        // 6. Reservation must still be approved
        // ---------------------------------------------------------

        if (!string.Equals(
                reservation.Status,
                "Approved",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The reservation is no longer approved.");
        }

        // ---------------------------------------------------------
        // 7. Mark transaction as verified
        // ---------------------------------------------------------

        transaction.Status = "VERIFIED";

        await _transactions.ReplaceOneAsync(
            x => x.Id == transaction.Id,
            transaction);

        // ---------------------------------------------------------
        // 8. Return verification result
        // ---------------------------------------------------------

        return new TransactionVerificationResponse
        {
            Valid = true,

            TransactionToken = transactionToken,

            ReservationId = transaction.ReservationId,

            Status = "VERIFIED",

            Message = "Transaction QR verified successfully."
        };
    }

    public async Task<FinalizeTransactionResponse>
        FinalizeAsync(
            string transactionToken,
            string operatorId,
            string operatorRole)
    {
        if (string.IsNullOrWhiteSpace(transactionToken))
        {
            throw new InvalidOperationException(
                "Transaction token is required.");
        }

        var hash =
            HashToken(transactionToken);

        var transaction =
            await _transactions
                .Find(x =>
                    x.TransactionTokenHash == hash)
                .FirstOrDefaultAsync();

        if (transaction == null)
        {
            throw new InvalidOperationException(
                "Invalid transaction QR.");
        }

        /*
         * IMPORTANT:
         *
         * Verify everything again.
         * Do not trust the previous /verify request.
         */
        if (transaction.ExpiresAt < DateTime.UtcNow)
        {
            throw new InvalidOperationException(
                "This transaction QR has expired.");
        }

        if (transaction.Status == "COMPLETED")
        {
            throw new InvalidOperationException(
                "This transaction has already been completed.");
        }

        if (transaction.Status != "VERIFIED")
        {
            throw new InvalidOperationException(
                "Transaction must be verified before finalization.");
        }

        var reservation =
            await _reservationService.GetByIdAsync(
                transaction.ReservationId,
                operatorId,
                operatorRole);

        if (reservation == null)
        {
            throw new InvalidOperationException(
                "The reservation could not be found.");
        }

        if (!string.Equals(
                reservation.Status,
                "Approved",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The reservation is no longer approved.");
        }

        /*
         * ======================================================
         * ENERGY TRANSFER BUSINESS LOGIC GOES HERE
         * ======================================================
         *
         * Examples:
         *
         * - validate slot
         * - validate station
         * - validate energy amount
         * - check available capacity
         * - create energy transfer record
         * - update station slot
         * - update reservation
         * - release/consume booking capacity
         *
         * These operations should ideally be performed in
         * a dedicated transfer service.
         */

        transaction.Status = "COMPLETED";

        transaction.CompletedAt =
            DateTime.UtcNow;

        transaction.CompletedByOperatorId =
            operatorId;

        await _transactions.ReplaceOneAsync(
            x => x.Id == transaction.Id,
            transaction);

        return new FinalizeTransactionResponse
        {
            Success = true,

            ReservationId =
                transaction.ReservationId,

            Status = "COMPLETED",

            Message =
                "Energy transfer completed successfully.",

            CompletedAt =
                transaction.CompletedAt.Value
        };
    }

    private static string HashToken(
        string token)
    {
        using var sha256 =
            SHA256.Create();

        var bytes =
            Encoding.UTF8.GetBytes(token);

        var hash =
            sha256.ComputeHash(bytes);

        return Convert.ToHexString(hash);
    }
}
