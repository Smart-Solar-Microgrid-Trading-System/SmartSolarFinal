package com.smartsolarmicrogrid.app

import android.content.Context
import org.json.JSONObject

object OperationalDashboardApi {

    data class Summary(
        val currentBookings: Long,
        val pendingReservations: Long,
        val approvedFutureReservations: Long,
        val completedToday: Long
    )

    fun load(
        context: Context,
        token: String
    ): Result<Summary> {
        val result = ApiClient.request(
            context,
            "GET",
            "/api/dashboard/operations",
            token = token
        )

        if (result.statusCode !in 200..299) {
            return Result.failure(
                IllegalStateException(
                    ApiClient.errorMessage(
                        result,
                        "Operational dashboard data is unavailable."
                    )
                )
            )
        }

        return runCatching {
            val item = JSONObject(result.body)
            Summary(
                currentBookings = item.getLong("currentBookings"),
                pendingReservations = item.getLong("pendingReservations"),
                approvedFutureReservations = item.getLong("approvedFutureReservations"),
                completedToday = item.getLong("completedToday")
            )
        }
    }
}
