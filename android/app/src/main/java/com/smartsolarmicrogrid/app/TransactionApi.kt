package com.smartsolarmicrogrid.app

import android.content.Context
import org.json.JSONObject

object TransactionApi {

    data class QrTransaction(
        val reservationId: String,
        val transactionToken: String,
        val qrPayload: String,
        val status: String
    )

    data class Verification(
        val valid: Boolean,
        val reservationId: String,
        val prosumerNic: String,
        val prosumerName: String,
        val nodeId: String,
        val nodeName: String,
        val slotId: String,
        val energyAmountKw: Double,
        val startTime: String,
        val endTime: String,
        val status: String,
        val message: String
    )

    data class Finalization(
        val success: Boolean,
        val reservationId: String,
        val status: String,
        val message: String,
        val completedAt: String
    )

    fun generateQr(
        context: Context,
        token: String,
        reservationId: String
    ): Result<QrTransaction> {

        return parseObject(
            ApiClient.request(
                context,
                "POST",
                "/api/transactions/qr",
                JSONObject().apply {
                    put("reservationId", reservationId)
                },
                token
            )
        ) { json ->

            QrTransaction(
                reservationId = json.optString("reservationId"),
                transactionToken = json.optString("transactionToken"),
                qrPayload = json.optString("qrPayload"),
                status = json.optString("status")
            )
        }
    }

    fun verify(
        context: Context,
        token: String,
        transactionToken: String
    ): Result<Verification> {

        return parseObject(
            ApiClient.request(
                context,
                "POST",
                "/api/transactions/verify",
                JSONObject().apply {
                    put("transactionToken", transactionToken)
                },
                token
            )
        ) { json ->

            Verification(
                valid = json.optBoolean("valid"),
                reservationId = json.optString("reservationId"),
                prosumerNic = json.optString("prosumerNic"),
                prosumerName = json.optString("prosumerName"),
                nodeId = json.optString("nodeId"),
                nodeName = json.optString("nodeName"),
                slotId = json.optString("slotId"),
                energyAmountKw = json.optDouble("energyAmountKw"),
                startTime = json.optString("startTime"),
                endTime = json.optString("endTime"),
                status = json.optString("status"),
                message = json.optString("message")
            )
        }
    }

    fun finalizeTransfer(
        context: Context,
        token: String,
        transactionToken: String
    ): Result<Finalization> {

        return parseObject(
            ApiClient.request(
                context,
                "POST",
                "/api/transactions/finalize",
                JSONObject().apply {
                    put("transactionToken", transactionToken)
                },
                token
            )
        ) { json ->

            Finalization(
                success = json.optBoolean("success"),
                reservationId = json.optString("reservationId"),
                status = json.optString("status"),
                message = json.optString("message"),
                completedAt = json.optString("completedAt")
            )
        }
    }

    fun extractTransactionToken(
        qrValue: String
    ): String? {

        val value = qrValue.trim()

        val prefix = "SMARTSOLAR|TX|"

        if (!value.startsWith(prefix)) {
            return null
        }

        val transactionToken = value
            .removePrefix(prefix)
            .trim()

        return transactionToken.takeIf {
            it.isNotBlank()
        }
    }

    private fun <T> parseObject(
        result: ApiClient.ApiResult,
        mapper: (JSONObject) -> T
    ): Result<T> {

        if (result.statusCode !in 200..299) {
            return Result.failure(
                Exception(
                    "HTTP ${result.statusCode}: ${ApiClient.errorMessage(result)}"
                )
            )
        }

        return runCatching {
            mapper(JSONObject(result.body))
        }
    }
}
