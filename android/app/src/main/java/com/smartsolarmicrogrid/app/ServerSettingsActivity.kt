package com.smartsolarmicrogrid.app

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ImageButton
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL

class ServerSettingsActivity : Activity() {
    private lateinit var apiUrlInput: EditText
    private lateinit var resultText: TextView
    private lateinit var saveButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_server_settings)
        apiUrlInput = findViewById(R.id.apiUrlInput)
        resultText = findViewById(R.id.resultText)
        saveButton = findViewById(R.id.saveButton)
        val backButton = findViewById<ImageButton>(R.id.settingsBackButton)
        if (intent.getBooleanExtra("opened_from_home", false)) {
            backButton.visibility = View.VISIBLE
            backButton.setOnClickListener { finish() }
        }
        apiUrlInput.setText(getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE).getString(API_URL_KEY, ""))
        saveButton.setOnClickListener { saveAndTestAddress() }
    }

    private fun saveAndTestAddress() {
        val baseUrl = apiUrlInput.text.toString().trim().trimEnd('/')
        if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
            showResult("Enter an address beginning with http:// or https://", false)
            return
        }
        saveButton.isEnabled = false
        showResult("Testing the server address ...", null)
        Thread {
            var connection: HttpURLConnection? = null
            try {
                connection = (URL("$baseUrl/health").openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 8_000
                    readTimeout = 8_000
                }
                val responseCode = connection.responseCode
                val responseBody = (if (responseCode in 200..299) connection.inputStream else connection.errorStream)
                    ?.bufferedReader()?.use { it.readText() }.orEmpty()
                if (responseCode in 200..299) {
                    getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE).edit().putString(API_URL_KEY, baseUrl).apply()
                    showResult("Server saved successfully (HTTP $responseCode).\n$responseBody", true)
                } else showResult("The server responded with HTTP $responseCode. The address was not saved.\n$responseBody", false)
            } catch (exception: Exception) {
                showResult("Could not reach the server. The address was not saved.\n${exception.message}", false)
            } finally {
                connection?.disconnect()
                runOnUiThread { saveButton.isEnabled = true }
            }
        }.start()
    }

    private fun showResult(message: String, successful: Boolean?) = runOnUiThread {
        resultText.visibility = View.VISIBLE
        resultText.text = message
        resultText.setTextColor(when (successful) {
            true -> getColor(R.color.status_success)
            false -> getColor(R.color.status_error)
            null -> Color.DKGRAY
        })
    }

    private companion object {
        const val PREFERENCES_NAME = "smart_solar_microgrid_preferences"
        const val API_URL_KEY = "api_url"
    }
}
