package com.smartsolarmicrogrid.app

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class TransferCompleteActivity :
    AppCompatActivity() {

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_transfer_complete
        )

        TopAppBar.configure(this, "Transfer Complete")

        val messageText =
            findViewById<TextView>(
                R.id.messageText
            )

        val reservationIdText =
            findViewById<TextView>(
                R.id.reservationIdText
            )

        val scanAnotherButton =
            findViewById<Button>(
                R.id.scanAnotherButton
            )

        val reservationId =
            intent.getStringExtra(
                "reservationId"
            ) ?: ""

        val message =
            intent.getStringExtra(
                "message"
            )
                ?: "Energy transfer completed successfully."

        messageText.text =
            message

        reservationIdText.text =
            "Reservation ID: $reservationId"

        scanAnotherButton.setOnClickListener {

            val intent =
                Intent(
                    this,
                    QrScannerActivity::class.java
                )

            startActivity(intent)

            finish()
        }
    }
}
