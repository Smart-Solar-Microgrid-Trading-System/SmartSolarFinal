package com.smartsolarmicrogrid.app

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {
    fun post(context: Context, path: String, payload: JSONObject): ApiResult {
        return request(context, "POST", path, payload)
    }

    fun request(context: Context, method: String, path: String, payload: JSONObject? = null, token: String? = null): ApiResult {
        val baseUrl = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
            .getString(API_URL_KEY, "")
            .orEmpty()
            .trim()
            .trimEnd('/')
        if (baseUrl.isBlank()) return ApiResult(0, "", "Server address is not configured.")

        var connection: HttpURLConnection? = null
        return try {
            connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = 8_000
                readTimeout = 8_000
                if (payload != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                }
                if (token != null) setRequestProperty("Authorization", "Bearer $token")
            }
            if (payload != null) connection.outputStream.bufferedWriter().use { it.write(payload.toString()) }
            val code = connection.responseCode
            val body = (if (code in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() }.orEmpty()
            ApiResult(code, body, null)
        } catch (exception: Exception) {
            ApiResult(0, "", "Could not reach the API: ${exception.message}")
        } finally {
            connection?.disconnect()
        }
    }

    data class ApiResult(val statusCode: Int, val body: String, val connectionError: String?)

    fun errorMessage(result: ApiResult, fallback: String = "The request could not be completed."): String {
        if (result.connectionError != null) return result.connectionError
        return try {
            val payload = JSONObject(result.body)
            val directError = payload.optString("error")
            if (directError.isNotBlank()) return directError

            val errors = payload.optJSONObject("errors")
            if (errors != null) {
                val fields = errors.keys()
                if (fields.hasNext()) {
                    val field = fields.next()
                    val messages = errors.optJSONArray(field)
                    val message = messages?.optString(0).orEmpty()
                    if (message.isNotBlank()) return "$field: $message"
                }
            }

            payload.optString("title").ifBlank { fallback }
        } catch (_: Exception) {
            fallback
        }
    }

    private const val PREFERENCES_NAME = "smart_solar_microgrid_preferences"
    private const val API_URL_KEY = "api_url"
}
