using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.DataProtection;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class TransactionService
{
    private readonly IMongoCollection<EnergyTransaction> _transactions;
    private readonly IMongoCollection<EnergyReservation> _reservations;
    private readonly ReservationQueryService _reservationService;
    private readonly IDataProtector _qrPayloadProtector;

    public TransactionService(
        IMongoDatabase database,
        ReservationQueryService reservationService,
        IDataProtectionProvider dataProtectionProvider)
    {
        _transactions =
            database.GetCollection<EnergyTransaction>(
                "EnergyTransactions");

        _reservations =
            database.GetCollection<EnergyReservation>(
                "EnergyReservations");

        _reservationService = reservationService;
        _qrPayloadProtector = dataProtectionProvider.CreateProtector(
            "SmartSolarMicrogrid.TransactionQrPayload.v1");
    }

    public async Task<TransactionQrResponse?> GenerateQrAsync(
    string reservationId,
    string userId,
    string role)
    {
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
                     x.Status == "VERIFIED"))
                .FirstOrDefaultAsync();

        if (existing != null)
        {
            if (!string.IsNullOrWhiteSpace(existing.ProtectedQrPayload))
            {
                return new TransactionQrResponse
                {
                    ReservationId = reservation.Id,
                    QrPayload = _qrPayloadProtector.Unprotect(
                        existing.ProtectedQrPayload),
                    Status = existing.Status
                };
            }

            // QR records created before protected payload storage cannot be
            // redrawn because only their one-way token hash is available.
            // Retire that legacy QR and create a replacement below.
            existing.Status = "REPLACED";
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

        var qrPayload =
            $"SMARTSOLAR|TX|{transactionToken}";

        var protectedQrPayload =
            _qrPayloadProtector.Protect(qrPayload);


        // ---------------------------------------------------------
        // 6. Create EnergyTransaction. The QR remains valid until
        // the reservation is cancelled or the transfer is completed.
        // ---------------------------------------------------------

        var transaction = new EnergyTransaction
        {
            Id = Guid.NewGuid().ToString(),

            ReservationId = reservation.Id,

            ProsumerId = userId,

            NodeId = reservation.NodeId,

            SlotId = reservation.SlotId,

            TransactionTokenHash = tokenHash,

            ProtectedQrPayload = protectedQrPayload,

            Status = "ISSUED",

            CreatedAt = DateTime.UtcNow
        };


        // ---------------------------------------------------------
        // 7. Save EnergyTransaction to MongoDB
        // ---------------------------------------------------------

        await _transactions.InsertOneAsync(transaction);


        // ---------------------------------------------------------
        // 8. Return QR information to Android
        // ---------------------------------------------------------

        return new TransactionQrResponse
        {
            ReservationId = reservation.Id,

            TransactionToken = transactionToken,

            QrPayload = qrPayload,

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
        // 3. Check transaction status
        // ---------------------------------------------------------

        if (transaction.Status == "COMPLETED")
        {
            throw new InvalidOperationException(
                "This transaction has already been completed.");
        }

        if (transaction.Status != "ISSUED" &&
            transaction.Status != "VERIFIED")
        {
            throw new InvalidOperationException(
                $"Transaction cannot be verified because its current status is '{transaction.Status}'.");
        }

        // ---------------------------------------------------------
        // 4. Get reservation
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
        // 5. Reservation must still be approved
        // ---------------------------------------------------------

        if (!string.Equals(
                reservation.Status,
                "Approved",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The reservation is no longer approved.");
        }

        if (transaction.Status == "VERIFIED")
        {
            return CreateVerificationResponse(
                reservation,
                transactionToken,
                "Transaction QR is already verified.");
        }

        // ---------------------------------------------------------
        // 6. Mark transaction as verified
        // ---------------------------------------------------------

        transaction.Status = "VERIFIED";

        await _transactions.ReplaceOneAsync(
            x => x.Id == transaction.Id,
            transaction);

        // ---------------------------------------------------------
        // 7. Return verification result
        // ---------------------------------------------------------

        return CreateVerificationResponse(
            reservation,
            transactionToken,
            "Transaction QR verified successfully.");
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

        var completedAt = DateTime.UtcNow;

        transaction.Status = "COMPLETED";
        transaction.CompletedAt = completedAt;

        transaction.CompletedByOperatorId =
            operatorId;

        await _transactions.ReplaceOneAsync(
            x => x.Id == transaction.Id,
            transaction);

        var reservationUpdate = await _reservations.UpdateOneAsync(
            item =>
                item.Id == transaction.ReservationId &&
                item.Status == ReservationStatuses.Approved,
            Builders<EnergyReservation>.Update
                .Set(item => item.Status, ReservationStatuses.Completed)
                .Set(item => item.CompletedAt, completedAt)
                .Set(item => item.UpdatedAt, completedAt));

        if (reservationUpdate.ModifiedCount != 1)
        {
            throw new InvalidOperationException(
                "The reservation is no longer approved and cannot be completed.");
        }

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

    private static TransactionVerificationResponse CreateVerificationResponse(
        ReservationResponse reservation,
        string transactionToken,
        string message)
    {
        return new TransactionVerificationResponse
        {
            Valid = true,
            TransactionToken = transactionToken,
            ReservationId = reservation.Id,
            ProsumerNic = reservation.ProsumerNic,
            ProsumerName = reservation.ProsumerName ?? string.Empty,
            NodeId = reservation.NodeId,
            NodeName = reservation.NodeName ?? reservation.NodeId,
            SlotId = reservation.SlotId,
            EnergyAmountKw = reservation.EnergyAmountKw,
            StartTime = reservation.StartTime,
            EndTime = reservation.EndTime,
            Status = reservation.Status,
            Message = message
        };
    }
}
