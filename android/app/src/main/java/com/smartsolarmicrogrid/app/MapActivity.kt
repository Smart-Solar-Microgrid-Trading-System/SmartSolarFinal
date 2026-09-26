package com.smartsolarmicrogrid.app

import android.os.Bundle
import android.view.View
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.fragment.app.FragmentActivity
import org.json.JSONArray
import org.osmdroid.config.Configuration
import org.osmdroid.util.GeoPoint
import org.osmdroid.views.MapView
import org.osmdroid.views.overlay.Marker

class MapActivity : FragmentActivity() {

    private lateinit var mapView: MapView
    private lateinit var progressBar: ProgressBar
    private lateinit var feedbackText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialize osmdroid configuration
        Configuration.getInstance().load(
            applicationContext,
            getSharedPreferences("osmdroid", MODE_PRIVATE)
        )

        Configuration.getInstance().userAgentValue =
            packageName

        setContentView(R.layout.activity_map)

        findViewById<ImageButton>(R.id.pageBackButton).setOnClickListener {
            finish()
        }

        mapView = findViewById(R.id.map)
        progressBar = findViewById(R.id.progressBar)
        feedbackText = findViewById(R.id.feedbackText)

        // Basic map controls
        mapView.setMultiTouchControls(true)
        mapView.controller.setZoom(12.0)

        // Temporary starting position: Colombo
        mapView.controller.setCenter(
            GeoPoint(6.9271, 79.8612)
        )

        AppNavigation.configure(
            this,
            AppNavigation.Destination.Map
        )

        loadNodes()
    }

    override fun onResume() {
        super.onResume()
        mapView.onResume()
    }

    override fun onPause() {
        super.onPause()
        mapView.onPause()
    }

    private fun loadNodes() {

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

                if (result.statusCode !in 200..299) {

                    showError(
                        "Unable to load grid nodes. HTTP ${result.statusCode}"
                    )

                    return@runOnUiThread
                }

                try {

                    val nodes = JSONArray(result.body)

                    displayNodes(nodes)

                } catch (exception: Exception) {

                    showError(
                        "Unable to read grid node information."
                    )
                }
            }
        }.start()
    }

    private fun displayNodes(nodes: JSONArray) {

        mapView.overlays.clear()

        if (nodes.length() == 0) {

            showError(
                "No active grid nodes are currently available."
            )

            mapView.invalidate()

            return
        }

        var firstLocation: GeoPoint? = null

        for (i in 0 until nodes.length()) {

            val node = nodes.getJSONObject(i)

            val name = node.optString(
                "name",
                "Grid Node"
            )

            val address = node.optString(
                "address",
                "Address unavailable"
            )

            val latitude = node.optDouble(
                "latitude",
                Double.NaN
            )

            val longitude = node.optDouble(
                "longitude",
                Double.NaN
            )

            val capacity = node.optDouble(
                "capacityKw",
                0.0
            )

            val availableSlots = node.optInt(
                "availableBatterySlots",
                0
            )

            if (latitude.isNaN() || longitude.isNaN()) {
                continue
            }

            val location = GeoPoint(
                latitude,
                longitude
            )

            if (firstLocation == null) {
                firstLocation = location
            }

            val marker = Marker(mapView)

            marker.position = location

            marker.title = name

            marker.snippet =
                "$address\n" +
                        "Capacity: $capacity kW\n" +
                        "Available slots: $availableSlots"

            marker.setAnchor(
                Marker.ANCHOR_CENTER,
                Marker.ANCHOR_BOTTOM
            )

            mapView.overlays.add(marker)
        }

        firstLocation?.let { location ->

            mapView.controller.setCenter(location)

            mapView.controller.setZoom(14.0)
        }

        mapView.invalidate()
    }

    private fun showError(message: String) {

        feedbackText.visibility = View.VISIBLE

        feedbackText.text = message
    }
}