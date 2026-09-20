package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.TextView
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var statusText: TextView
    private lateinit var serviceStatusTitleText: TextView
    private lateinit var openServerSettingsButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        statusText = findViewById(R.id.statusText)
        serviceStatusTitleText = findViewById(R.id.serviceStatusTitleText)
        openServerSettingsButton = findViewById(R.id.openServerSettingsButton)
        val session = SessionDatabaseHelper(this).getSession()
        findViewById<TextView>(R.id.roleSubtitleText).text = when (session?.role) {
            "GridOperator" -> "Grid Operator mobile application"
            "Prosumer" -> "Prosumer mobile application"
            else -> "Smart Solar Microgrid mobile application"
        }
        findViewById<TextView>(R.id.greetingText).text = session?.name?.let { "Hello, $it" } ?: "Welcome"
        findViewById<TextView>(R.id.signedInText).text = session?.role ?: "No signed-in user"
        findViewById<android.widget.ImageButton>(R.id.settingsIconButton).setOnClickListener {
            openServerSettings()
        }
        openServerSettingsButton.setOnClickListener { openServerSettings() }
        AppNavigation.configure(this, AppNavigation.Destination.Home)
        configureRoleDashboard(session?.role)
        findViewById<Button>(R.id.signOutButton).setOnClickListener {
            SessionDatabaseHelper(this).clearSession()
            SessionDatabaseHelper(this).clearProfile()
            startActivity(Intent(this, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
            finish()
        }
    }

    override fun onResume() {
        super.onResume()
        checkSavedApiHealth()
    }

    private fun checkSavedApiHealth() {
        val baseUrl = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
            .getString(API_URL_KEY, "").orEmpty().trim().trimEnd('/')
        if (baseUrl.isBlank()) {
            showStatus("Server setup is required before this device can connect to the Smart Solar Microgrid API.", false)
            return
        }

        showStatus("Connecting to the Smart Solar Microgrid service ...", null)
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
                showStatus(
                    if (responseCode in 200..299) "Connected to the microgrid service"
                    else "API responded with HTTP $responseCode.\n$responseBody",
                    responseCode in 200..299
                )
            } catch (exception: Exception) {
                showStatus("Could not reach the API. Open Server Settings if the host laptop or network changed.\n${exception.message}", false)
            } finally {
                connection?.disconnect()
            }
        }.start()
    }

    private fun showStatus(message: String, successful: Boolean?) = runOnUiThread {
        if (successful == true) {
            serviceStatusTitleText.visibility = View.GONE
            statusText.visibility = View.GONE
            openServerSettingsButton.visibility = View.GONE
            return@runOnUiThread
        }

        serviceStatusTitleText.visibility = View.VISIBLE
        statusText.visibility = View.VISIBLE
        openServerSettingsButton.visibility = if (successful == false) View.VISIBLE else View.GONE
        statusText.text = message
        statusText.setTextColor(when (successful) {
            true -> getColor(R.color.status_success)
            false -> getColor(R.color.status_error)
            null -> Color.DKGRAY
        })
    }

    private fun openServerSettings() {
        startActivity(Intent(this, ServerSettingsActivity::class.java).putExtra("opened_from_home", true))
    }

    private fun configureRoleDashboard(role: String?) {
        val primaryAction = findViewById<Button>(R.id.bookingShortcutButton)
        val secondaryAction = findViewById<Button>(R.id.mapShortcutButton)
        val prosumerBenefitsPanel = findViewById<View>(R.id.prosumerBenefitsPanel)

        if (role == "GridOperator") {
            prosumerBenefitsPanel.visibility = View.GONE
            findViewById<TextView>(R.id.activityTitleText).text = "Operational overview"
            findViewById<TextView>(R.id.activeLabelText).text = "Active transfers"
            findViewById<TextView>(R.id.pendingLabelText).text = "Pending verifications"
            findViewById<TextView>(R.id.activeDescriptionText).text = "Available after transfer API"
            findViewById<TextView>(R.id.pendingDescriptionText).text = "Available after transfer API"
            primaryAction.text = "Open operations"
            primaryAction.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_operations, 0, 0, 0)
            primaryAction.setOnClickListener { AppNavigation.openOperations(this) }
            secondaryAction.text = "View bookings"
            secondaryAction.setCompoundDrawablesWithIntrinsicBounds(R.drawable.ic_bookings, 0, 0, 0)
            secondaryAction.setOnClickListener { AppNavigation.openBookings(this) }
        } else {
            prosumerBenefitsPanel.visibility = View.VISIBLE
            primaryAction.setOnClickListener { AppNavigation.openBookings(this) }
            secondaryAction.setOnClickListener { AppNavigation.openMap(this) }
        }
    }

    private companion object {
        const val PREFERENCES_NAME = "smart_solar_microgrid_preferences"
        const val API_URL_KEY = "api_url"
    }
}
