package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView

class GridOperatorHomeActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_grid_operator_home)

        val session = SessionDatabaseHelper(this)
        val profile = session.getSession()

        findViewById<TextView>(R.id.operatorNameText).text =
            profile?.name ?: "Grid Operator"

        // Open Map
        findViewById<Button>(R.id.mapButton).setOnClickListener {
            startActivity(Intent(this, MapActivity::class.java))
        }

        // Open Nearby Stations
        findViewById<Button>(R.id.nearbyStationsButton).setOnClickListener {
            startActivity(Intent(this, NearbyStationsActivity::class.java))
        }

        // Open QR Scanner
        findViewById<Button>(R.id.scanQrButton).setOnClickListener {
            startActivity(Intent(this, QRScannerActivity::class.java))
        }

        // Open Booking Verification
        findViewById<Button>(R.id.verifyBookingButton).setOnClickListener {
            startActivity(Intent(this, BookingVerificationActivity::class.java))
        }

        // Open Transfer
        findViewById<Button>(R.id.finalizeTransferButton).setOnClickListener {
            startActivity(Intent(this, TransferActivity::class.java))
        }
    }
}