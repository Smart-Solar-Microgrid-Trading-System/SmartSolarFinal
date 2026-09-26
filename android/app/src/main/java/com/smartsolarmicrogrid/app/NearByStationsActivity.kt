package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import org.json.JSONArray

class NearbyStationsActivity : Activity() {

    private lateinit var stationContainer: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var feedbackText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nearby_stations)

        stationContainer = findViewById(R.id.stationContainer)
        progressBar = findViewById(R.id.progressBar)
        feedbackText = findViewById(R.id.feedbackText)

        findViewById<ImageButton>(R.id.pageBackButton).setOnClickListener {
            finish()
        }

        loadStations()
    }

    private fun loadStations() {

        progressBar.visibility = View.VISIBLE
        feedbackText.visibility = View.GONE

        // Get the logged-in user's session
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
                path = "/api/nodes",
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

                if (result.statusCode in 200..299) {

                    try {
                        val stations = JSONArray(result.body)

                        displayStations(stations)

                    } catch (e: Exception) {

                        showError(
                            "Unable to read station information."
                        )
                    }

                } else {

                    showError(
                        "Unable to load stations. HTTP ${result.statusCode}\n" +
                                ApiClient.errorMessage(
                                    result,
                                    "The server returned an error."
                                )
                    )
                }
            }
        }.start()
    }

    private fun displayStations(stations: JSONArray) {

        stationContainer.removeAllViews()

        if (stations.length() == 0) {
            showError("No active stations are currently available.")
            return
        }

        feedbackText.visibility = View.GONE

        for (i in 0 until stations.length()) {

            val station = stations.getJSONObject(i)

            val stationId = station.optString("id")

            val stationName = station.optString(
                "name",
                "Unnamed Station"
            )

            val latitude = station.optDouble(
                "latitude",
                0.0
            )

            val longitude = station.optDouble(
                "longitude",
                0.0
            )

            val capacity = station.optDouble(
                "capacityKw",
                0.0
            )

            val slots = station.optInt(
                "availableBatterySlots",
                0
            )

            // Station container
            val stationLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(24, 24, 24, 24)

                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )

                params.setMargins(0, 0, 0, 24)

                layoutParams = params

                setBackgroundResource(
                    android.R.drawable.dialog_holo_light_frame
                )
            }

            // Station name
            val nameText = TextView(this).apply {
                text = stationName
                textSize = 20f
                setTypeface(
                    null,
                    android.graphics.Typeface.BOLD
                )
            }

            // Capacity
            val capacityText = TextView(this).apply {
                text = "Capacity: $capacity kW"
                textSize = 15f
                setPadding(0, 8, 0, 0)
            }

            // Available slots
            val slotsText = TextView(this).apply {
                text = "Available battery slots: $slots"
                textSize = 15f
                setPadding(0, 4, 0, 0)
            }

            // Coordinates
            val locationText = TextView(this).apply {
                text = "Location: $latitude, $longitude"
                textSize = 14f
                setPadding(0, 4, 0, 0)
            }

            // Details button
            val detailsButton = Button(this).apply {

                text = "View Details"

                val params = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )

                params.topMargin = 12
                layoutParams = params

                setOnClickListener {

                    if (stationId.isBlank()) {
                        showError(
                            "Station ID is missing. Cannot open station details."
                        )
                        return@setOnClickListener
                    }

                    val intent = Intent(
                        this@NearbyStationsActivity,
                        StationDetailsActivity::class.java
                    )

                    intent.putExtra("station_id", stationId)

                    startActivity(intent)
                }

            }

            stationLayout.addView(nameText)
            stationLayout.addView(capacityText)
            stationLayout.addView(slotsText)
            stationLayout.addView(locationText)
            stationLayout.addView(detailsButton)

            stationContainer.addView(stationLayout)
        }
    }

    private fun showError(message: String) {

        feedbackText.visibility = View.VISIBLE
        feedbackText.text = message
    }
}