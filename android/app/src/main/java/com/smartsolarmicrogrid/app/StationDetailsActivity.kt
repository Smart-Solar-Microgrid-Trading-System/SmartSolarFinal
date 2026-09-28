package com.smartsolarmicrogrid.app

import android.app.Activity
import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import org.json.JSONObject

class StationDetailsActivity : Activity() {

    private lateinit var progressBar: ProgressBar
    private lateinit var feedbackText: TextView

    private lateinit var stationNameText: TextView
    private lateinit var addressText: TextView
    private lateinit var capacityText: TextView
    private lateinit var slotsText: TextView
    private lateinit var latitudeText: TextView
    private lateinit var longitudeText: TextView
    private lateinit var stationIdText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_station_details)

        // Find views
        progressBar = findViewById(R.id.progressBar)
        feedbackText = findViewById(R.id.feedbackText)

        stationNameText = findViewById(R.id.stationNameText)
        addressText = findViewById(R.id.addressText)
        capacityText = findViewById(R.id.capacityText)
        slotsText = findViewById(R.id.slotsText)
        latitudeText = findViewById(R.id.latitudeText)
        longitudeText = findViewById(R.id.longitudeText)
        stationIdText = findViewById(R.id.stationIdText)

        // Back button
        findViewById<ImageButton>(R.id.pageBackButton).setOnClickListener {
            finish()
        }

        // Get station ID sent from NearbyStationsActivity
        val stationId = intent.getStringExtra("station_id")

        if (stationId.isNullOrBlank()) {
            showError("Station ID was not provided.")
            return
        }

        loadStationDetails(stationId)
    }

    private fun loadStationDetails(stationId: String) {

        progressBar.visibility = View.VISIBLE
        feedbackText.visibility = View.GONE

        val session = SessionDatabaseHelper(this).getSession()

        if (session == null) {
            progressBar.visibility = View.GONE
            showError("You are not logged in.")
            return
        }

        Thread {

            val result = ApiClient.request(
                context = this,
                method = "GET",
                path = "/api/nodes/$stationId",
                token = session.token
            )

            runOnUiThread {

                progressBar.visibility = View.GONE

                if (result.connectionError != null) {

                    showError(
                        ApiClient.errorMessage(
                            result,
                            "Unable to connect to the microgrid service."
                        )
                    )

                    return@runOnUiThread
                }

                if (result.statusCode !in 200..299) {

                    showError(
                        "Unable to load station details. HTTP ${result.statusCode}\n" +
                                ApiClient.errorMessage(
                                    result,
                                    "The server returned an error."
                                )
                    )

                    return@runOnUiThread
                }

                try {

                    val station = JSONObject(result.body)

                    displayStationDetails(station)

                } catch (exception: Exception) {

                    showError(
                        "Unable to read station information."
                    )
                }
            }
        }.start()
    }

    private fun displayStationDetails(station: JSONObject) {

        val id = station.optString(
            "id",
            "Unavailable"
        )

        val name = station.optString(
            "name",
            "Unnamed Station"
        )

        val address = station.optString(
            "address",
            "Address unavailable"
        )

        val capacity = station.optDouble(
            "capacityKw",
            0.0
        )

        val availableSlots = station.optInt(
            "availableBatterySlots",
            0
        )

        val latitude = station.optDouble(
            "latitude",
            0.0
        )

        val longitude = station.optDouble(
            "longitude",
            0.0
        )

        stationIdText.text = id
        stationNameText.text = name
        addressText.text = address
        capacityText.text = "$capacity kW"
        slotsText.text = availableSlots.toString()
        latitudeText.text = latitude.toString()
        longitudeText.text = longitude.toString()

        feedbackText.visibility = View.GONE
    }

    private fun showError(message: String) {

        feedbackText.visibility = View.VISIBLE
        feedbackText.text = message
    }
}