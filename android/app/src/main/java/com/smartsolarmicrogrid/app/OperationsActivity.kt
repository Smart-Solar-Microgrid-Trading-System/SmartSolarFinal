package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.ImageButton

class OperationsActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_operations)

        val pageBackButton =
            findViewById<ImageButton>(R.id.pageBackButton)

        val pendingReservationsButton =
            findViewById<Button>(R.id.pendingReservationsButton)

        val approvedReservationsButton =
            findViewById<Button>(R.id.approvedReservationsButton)

        pageBackButton.setOnClickListener {
            finish()
        }

        pendingReservationsButton.setOnClickListener {
            startActivity(
                Intent(
                    this,
                    PendingReservationsActivity::class.java
                )
            )
        }

        approvedReservationsButton.setOnClickListener {
            startActivity(
                Intent(
                    this,
                    VerifiedReservationsActivity::class.java
                )
            )
        }

        AppNavigation.configure(
            this,
            AppNavigation.Destination.Operations
        )
    }
}
