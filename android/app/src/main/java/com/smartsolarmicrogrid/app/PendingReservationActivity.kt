package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.graphics.Typeface
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.ImageButton

class PendingReservationsActivity : Activity() {

    private lateinit var statusText: TextView
    private lateinit var reservationsContainer: LinearLayout

    private var token: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_pending_reservations
        )

        findViewById<ImageButton>(
            R.id.pageBackButton
        ).setOnClickListener {
            AppNavigation.openOperations(this)
        }

        statusText =
            findViewById(R.id.statusText)

        reservationsContainer =
            findViewById(R.id.reservationsContainer)

        loadSession()

        if (token.isBlank()) {
            statusText.text =
                "Authentication information is missing."
            return
        }

        loadReservations()
    }

    override fun onResume() {
        super.onResume()

        if (::reservationsContainer.isInitialized) {

            loadSession()

            if (token.isNotBlank()) {
                loadReservations()
            }
        }
    }

    private fun loadSession() {

        val session =
            SessionDatabaseHelper(this).getSession()

        token =
            session?.token.orEmpty()
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
        reservation: ReservationApi.Reservation
    ) {

        val card = LinearLayout(this)

        card.orientation = LinearLayout.VERTICAL

        card.setPadding(
            24,
            20,
            24,
            20
        )

        card.setBackgroundResource(
            android.R.drawable.dialog_holo_light_frame
        )

        val params = LinearLayout.LayoutParams(
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

        val title = TextView(this)

        title.text =
            reservation.nodeName
                .takeIf { it.isNotBlank() }
                ?: "Unknown Station"

        title.textSize = 19f

        title.setTypeface(
            null,
            Typeface.BOLD
        )

        card.addView(title)

        val reservationId = TextView(this)

        reservationId.text =
            "Reservation ID: ${reservation.id}"

        reservationId.textSize = 14f

        card.addView(reservationId)

        val prosumer = TextView(this)

        prosumer.text =
            "Prosumer: ${
                reservation.prosumerName
                    .takeIf { it.isNotBlank() }
                    ?: "Unknown"
            }\nNIC: ${reservation.prosumerNic}"

        prosumer.textSize = 16f

        card.addView(prosumer)

        val time = TextView(this)

        time.text =
            "Time: ${reservation.startTime} - ${reservation.endTime}"

        time.textSize = 15f

        card.addView(time)

        val energy = TextView(this)

        energy.text =
            "Energy: ${reservation.energyAmountKw} kW"

        energy.textSize = 15f

        card.addView(energy)

        val status = TextView(this)

        status.text =
            "Status: ${reservation.status}"

        status.textSize = 15f

        card.addView(status)

        val approveButton = Button(this)

        approveButton.text = "Approve"

        approveButton.setOnClickListener {

            approveReservation(
                reservation.id
            )
        }

        card.addView(approveButton)

        val rejectButton = Button(this)

        rejectButton.text = "Reject"

        rejectButton.setOnClickListener {

            rejectReservation(
                reservation.id
            )
        }

        card.addView(rejectButton)

        reservationsContainer.addView(card)
    }
    private fun approveReservation(
        reservationId: String
    ) {

        statusText.text =
            "Approving reservation..."

        Thread {

            val result =
                ReservationApi.approve(
                    this,
                    token,
                    reservationId
                )

            runOnUiThread {

                result
                    .onSuccess {

                        statusText.text =
                            "Reservation approved."

                        loadReservations()
                    }
                    .onFailure { error ->

                        statusText.text =
                            error.message
                                ?: "Unable to approve reservation."
                    }
            }

        }.start()
    }
    private fun rejectReservation(
        reservationId: String
    ) {

        statusText.text =
            "Rejecting reservation..."

        Thread {

            val result =
                ReservationApi.reject(
                    this,
                    token,
                    reservationId
                )

            runOnUiThread {

                result
                    .onSuccess {

                        statusText.text =
                            "Reservation rejected."

                        loadReservations()
                    }
                    .onFailure { error ->

                        statusText.text =
                            error.message
                                ?: "Unable to reject reservation."
                    }
            }

        }.start()
    }
}