package com.smartsolarmicrogrid.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object ReservationApi {

    data class Node(
        val id: String,
        val name: String,
        val capacityKw: Double
    )

    data class Slot(
        val id: String,
        val nodeId: String,
        val startTime: String,
        val endTime: String,
        val capacityKw: Double,
        val status: String,
        val isActive: Boolean
    )

    data class Reservation(
        val id: String,
        val prosumerNic: String,
        val prosumerName: String,
        val nodeId: String,
        val nodeName: String,
        val slotId: String,
        val energyAmountKw: Double,
        val startTime: String,
        val endTime: String,
        val status: String,
        val createdAt: String,
        val updatedAt: String,
        val cancelledAt: String?
    )

    data class DashboardSummary(
        val pendingReservations: Long,
        val approvedFutureReservations: Long,
        val currentBookings: Long,
        val completedToday: Long
    )

    fun nodes(
        context: Context,
        token: String
    ): Result<List<Node>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/nodes",
            token = token
        )

        return parseArray(result) { item ->
            Node(
                id = item.getString("id"),
                name = item.getString("name"),
                capacityKw = item.optDouble("capacityKw")
            )
        }
    }

    fun slots(
        context: Context,
        token: String,
        nodeId: String
    ): Result<List<Slot>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/booking-slots/node/${encode(nodeId)}",
            token = token
        )

        return parseArray(result) { item ->
            Slot(
                id = item.getString("id"),
                nodeId = item.getString("nodeId"),
                startTime = item.getString("startTime"),
                endTime = item.getString("endTime"),
                capacityKw = item.optDouble("capacityKw"),
                status = item.getString("status"),
                isActive = item.optBoolean("isActive")
            )
        }
    }

    fun reservations(
        context: Context,
        token: String
    ): Result<List<Reservation>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/reservations",
            token = token
        )

        return parseArray(result) {
            parseReservation(it)
        }
    }

    fun currentReservations(
        context: Context,
        token: String
    ): Result<List<Reservation>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/reservations/current",
            token = token
        )

        return parseArray(result) {
            parseReservation(it)
        }
    }

    fun pendingReservations(
        context: Context,
        token: String
    ): Result<List<Reservation>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/reservations/pending",
            token = token
        )

        return parseArray(result) {
            parseReservation(it)
        }
    }

    fun historyReservations(
        context: Context,
        token: String
    ): Result<List<Reservation>> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/reservations/history",
            token = token
        )

        return parseArray(result) {
            parseReservation(it)
        }
    }

    fun filteredReservations(
        context: Context,
        token: String,
        search: String? = null,
        status: String? = null,
        nodeId: String? = null,
        from: String? = null,
        to: String? = null
    ): Result<List<Reservation>> {

        val queryParams = mutableListOf<String>()

        if (!search.isNullOrBlank()) {
            queryParams.add("search=${encode(search)}")
        }

        if (!status.isNullOrBlank()) {
            queryParams.add("status=${encode(status)}")
        }

        if (!nodeId.isNullOrBlank()) {
            queryParams.add("nodeId=${encode(nodeId)}")
        }

        if (!from.isNullOrBlank()) {
            queryParams.add("from=${encode(from)}")
        }

        if (!to.isNullOrBlank()) {
            queryParams.add("to=${encode(to)}")
        }

        val path = if (queryParams.isEmpty()) {
            "/api/reservations"
        } else {
            "/api/reservations?${queryParams.joinToString("&")}"
        }

        val result = ApiClient.request(
            context,
            "GET",
            path,
            token = token
        )

        return parseArray(result) {
            parseReservation(it)
        }
    }

    fun reservation(
        context: Context,
        token: String,
        id: String
    ): Result<Reservation> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/reservations/${encode(id)}",
            token = token
        )

        return parseObject(
            result,
            ::parseReservation
        )
    }

    fun create(
        context: Context,
        token: String,
        nodeId: String,
        slotId: String,
        energy: Double
    ): Result<Reservation> {

        val body = JSONObject().apply {
            put("nodeId", nodeId)
            put("slotId", slotId)
            put("energyAmountKw", energy)
        }

        val result = ApiClient.request(
            context,
            "POST",
            "/api/reservations",
            body,
            token
        )

        return parseObject(
            result,
            ::parseReservation
        )
    }

    fun update(
        context: Context,
        token: String,
        id: String,
        slotId: String,
        energy: Double
    ): Result<Reservation> {

        val body = JSONObject().apply {
            put("slotId", slotId)
            put("energyAmountKw", energy)
        }

        val result = ApiClient.request(
            context,
            "PUT",
            "/api/reservations/${encode(id)}",
            body,
            token
        )

        return parseObject(
            result,
            ::parseReservation
        )
    }

    fun cancel(
        context: Context,
        token: String,
        id: String
    ): Result<Reservation> {

        val result = ApiClient.request(
            context,
            "DELETE",
            "/api/reservations/${encode(id)}",
            token = token
        )

        return parseObject(
            result,
            ::parseReservation
        )
    }

    fun prosumerDashboard(
        context: Context,
        token: String
    ): Result<DashboardSummary> {

        val result = ApiClient.request(
            context,
            "GET",
            "/api/dashboard/prosumer",
            token = token
        )

        return parseObject(result) { item ->
            DashboardSummary(
                pendingReservations =
                    item.optLong("pendingReservations"),

                approvedFutureReservations =
                    item.optLong("approvedFutureReservations"),

                currentBookings =
                    item.optLong("currentBookings"),

                completedToday =
                    item.optLong("completedToday")
            )
        }
    }

    private fun parseReservation(
        item: JSONObject
    ): Reservation {

        return Reservation(
            id = item.getString("id"),
            prosumerNic = item.optString("prosumerNic"),
            prosumerName = item.optString("prosumerName"),
            nodeId = item.optString("nodeId"),
            nodeName = item.optString("nodeName"),
            slotId = item.optString("slotId"),
            energyAmountKw = item.optDouble("energyAmountKw"),
            startTime = item.optString("startTime"),
            endTime = item.optString("endTime"),
            status = item.optString("status"),
            createdAt = item.optString("createdAt"),
            updatedAt = item.optString("updatedAt"),
            cancelledAt = item
                .optString("cancelledAt")
                .takeIf {
                    it.isNotBlank() &&
                    it != "null"
                }
        )
    }

    private fun <T> parseArray(
        result: ApiClient.ApiResult,
        mapper: (JSONObject) -> T
    ): Result<List<T>> {

        if (result.statusCode !in 200..299) {
            return Result.failure(
                Exception(
                    ApiClient.errorMessage(result)
                )
            )
        }

        return runCatching {
            val array = JSONArray(result.body)

            List(array.length()) {
                mapper(
                    array.getJSONObject(it)
                )
            }
        }
    }

    private fun <T> parseObject(
        result: ApiClient.ApiResult,
        mapper: (JSONObject) -> T
    ): Result<T> {

        if (result.statusCode !in 200..299) {
            return Result.failure(
                Exception(
                    ApiClient.errorMessage(result)
                )
            )
        }

        return runCatching {
            mapper(
                JSONObject(result.body)
            )
        }
    }

    private fun encode(
        value: String
    ): String {

        return java.net.URLEncoder.encode(
            value,
            Charsets.UTF_8.name()
        )
    }
}