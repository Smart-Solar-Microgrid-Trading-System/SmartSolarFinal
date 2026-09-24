package com.smartsolarmicrogrid.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object ReservationApi {
    data class Node(val id: String, val name: String, val capacityKw: Double)
    data class Slot(val id: String, val nodeId: String, val startTime: String, val endTime: String, val capacityKw: Double, val status: String, val isActive: Boolean)
    data class Reservation(
        val id: String, val prosumerNic: String, val prosumerName: String, val nodeId: String,
        val nodeName: String, val slotId: String, val energyAmountKw: Double, val startTime: String,
        val endTime: String, val status: String, val createdAt: String, val updatedAt: String,
        val cancelledAt: String?
    )

    fun nodes(context: Context, token: String): Result<List<Node>> = parseArray(
        ApiClient.request(context, "GET", "/api/nodes", token = token)
    ) { item -> Node(item.getString("id"), item.getString("name"), item.optDouble("capacityKw")) }

    fun slots(context: Context, token: String, nodeId: String): Result<List<Slot>> = parseArray(
        ApiClient.request(context, "GET", "/api/booking-slots/node/${encode(nodeId)}", token = token)
    ) { item -> Slot(item.getString("id"), item.getString("nodeId"), item.getString("startTime"), item.getString("endTime"), item.optDouble("capacityKw"), item.getString("status"), item.optBoolean("isActive")) }

    fun reservations(context: Context, token: String): Result<List<Reservation>> = parseArray(
        ApiClient.request(context, "GET", "/api/reservations", token = token)
    ) { parseReservation(it) }

    fun reservation(context: Context, token: String, id: String): Result<Reservation> = parseObject(
        ApiClient.request(context, "GET", "/api/reservations/${encode(id)}", token = token), ::parseReservation
    )

    fun create(context: Context, token: String, nodeId: String, slotId: String, energy: Double): Result<Reservation> = parseObject(
        ApiClient.request(context, "POST", "/api/reservations", JSONObject().apply {
            put("nodeId", nodeId); put("slotId", slotId); put("energyAmountKw", energy)
        }, token), ::parseReservation
    )

    fun update(context: Context, token: String, id: String, slotId: String, energy: Double): Result<Reservation> = parseObject(
        ApiClient.request(context, "PUT", "/api/reservations/${encode(id)}", JSONObject().apply {
            put("slotId", slotId); put("energyAmountKw", energy)
        }, token), ::parseReservation
    )

    fun cancel(context: Context, token: String, id: String): Result<Reservation> = parseObject(
        ApiClient.request(context, "DELETE", "/api/reservations/${encode(id)}", token = token), ::parseReservation
    )

    private fun parseReservation(item: JSONObject) = Reservation(
        item.getString("id"), item.optString("prosumerNic"), item.optString("prosumerName"),
        item.optString("nodeId"), item.optString("nodeName"), item.optString("slotId"),
        item.optDouble("energyAmountKw"), item.optString("startTime"), item.optString("endTime"),
        item.optString("status"), item.optString("createdAt"), item.optString("updatedAt"),
        item.optString("cancelledAt").takeIf { it.isNotBlank() && it != "null" }
    )

    private fun <T> parseArray(result: ApiClient.ApiResult, mapper: (JSONObject) -> T): Result<List<T>> {
        if (result.statusCode !in 200..299) return Result.failure(Exception(ApiClient.errorMessage(result)))
        return runCatching { val array = JSONArray(result.body); List(array.length()) { mapper(array.getJSONObject(it)) } }
    }

    private fun <T> parseObject(result: ApiClient.ApiResult, mapper: (JSONObject) -> T): Result<T> {
        if (result.statusCode !in 200..299) return Result.failure(Exception(ApiClient.errorMessage(result)))
        return runCatching { mapper(JSONObject(result.body)) }
    }

    private fun encode(value: String) = java.net.URLEncoder.encode(value, Charsets.UTF_8.name())
}
