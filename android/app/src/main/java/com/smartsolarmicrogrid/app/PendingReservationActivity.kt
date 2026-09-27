package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.graphics.Typeface
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PendingReservationsActivity : Activity() {

    private lateinit var statusText: TextView
    private lateinit var reservationsContainer: LinearLayout

    private var token: String = ""

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_pending_reservations
        )

        statusText =
            findViewById(R.id.statusText)

        reservationsContainer =
            findViewById(
                R.id.reservationsContainer
            )

        token =
            intent.getStringExtra("token")
                ?: ""

        if (token.isBlank()) {

            statusText.text =
                "Authentication information is missing."

            return
        }

        loadReservations()
    }

    override fun onResume() {
        super.onResume()

        if (
            ::reservationsContainer.isInitialized &&
            token.isNotBlank()
        ) {
            loadReservations()
        }
    }

    private fun loadReservations() {

        statusText.text =
            "Loading pending reservations..."

        reservationsContainer.removeAllViews()

        Thread {

            val result =
                ReservationApi.pendingReservations(
                    this,
                    token
                )

            runOnUiThread {

                result
                    .onSuccess { reservations ->

                        displayReservations(
                            reservations
                        )
                    }

                    .onFailure { error ->

                        statusText.text =
                            error.message
                                ?: "Unable to load reservations."
                    }
            }

        }.start()
    }

    private fun displayReservations(
        reservations:
        List<ReservationApi.Reservation>
    ) {

        reservationsContainer.removeAllViews()

        if (reservations.isEmpty()) {

            statusText.text =
                "There are no pending reservations."

            return
        }

        statusText.text =
            "${reservations.size} pending reservation(s)"

        reservations.forEach { reservation ->

            addReservationCard(
                reservation
            )
        }
    }

    private fun addReservationCard(
        reservation:
        ReservationApi.Reservation
    ) {

        val card =
            LinearLayout(this)

        card.orientation =
            LinearLayout.VERTICAL

        card.setPadding(
            24,
            20,
            24,
            20
        )

        card.setBackgroundResource(
            android.R.drawable.dialog_holo_light_frame
        )

        val params =
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )

        params.setMargins(
            0,
            0,
            0,
            20
        )

        card.layoutParams = params

        val title =
            TextView(this)

        title.text =
            reservation.nodeName.ifBlank {
                "Unknown Station"
            }

        title.textSize = 19f

        title.setTypeface(
            null,
            Typeface.BOLD
        )

        card.addView(title)

        val prosumer =
            TextView(this)

        prosumer.text =
            "Prosumer: ${reservation.prosumerName}\n" +
                    "NIC: ${reservation.prosumerNic}"

        prosumer.textSize = 16f

        val time =
            TextView(this)

        time.text =
            "Time: ${reservation.startTime} - ${reservation.endTime}"

        time.textSize = 15f

        val energy =
            TextView(this)

        energy.text =
            "Energy: ${reservation.energyAmountKw} kW"

        energy.textSize = 15f

        val status =
            TextView(this)

        status.text =
            "Status: ${reservation.status}"

        status.textSize = 15f

        card.addView(prosumer)
        card.addView(time)
        card.addView(energy)
        card.addView(status)

        val button =
            Button(this)

        button.text =
            "Verify Booking"

        button.setOnClickListener {

            openVerification(
                reservation.id
            )
        }

        card.addView(button)

        reservationsContainer.addView(
            card
        )
    }

    private fun openVerification(
        reservationId: String
    ) {

        val intent =
            Intent(
                this,
                BookingVerificationActivity::class.java
            )

        intent.putExtra(
            "reservationId",
            reservationId
        )

        intent.putExtra(
            "token",
            token
        )

        startActivity(intent)
    }
}