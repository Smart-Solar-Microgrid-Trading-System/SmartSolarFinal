package com.smartsolarmicrogrid.app

import android.app.Activity
import android.graphics.Typeface
import android.os.Bundle
import android.widget.Button
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.content.Intent

class ApprovedReservationsActivity : Activity() {

    private lateinit var statusText: TextView
    private lateinit var reservationsContainer: LinearLayout

    private var token: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_approved_reservations)

        val pageBackButton = findViewById<ImageButton>(
            R.id.pageBackButton
        )

        statusText = findViewById(R.id.statusText)
        reservationsContainer =
            findViewById(R.id.reservationsContainer)

        pageBackButton.setOnClickListener {
            AppNavigation.openOperations(this)
        }

        loadSession()

        if (token.isBlank()) {
            statusText.text =
                "Authentication information is missing."
            return
        }

        loadApprovedReservations()
    }

    override fun onResume() {
        super.onResume()

        if (::reservationsContainer.isInitialized) {
            loadSession()

            if (token.isNotBlank()) {
                loadApprovedReservations()
            }
        }
    }

    private fun loadSession() {
        val session =
            SessionDatabaseHelper(this).getSession()

        token = session?.token.orEmpty()
    }

    private fun loadApprovedReservations() {

        statusText.text =
            "Loading approved reservations..."

        reservationsContainer.removeAllViews()

        Thread {

            val result =
                ReservationApi.filteredReservations(
                    this,
                    token,
                    status = "Approved"
                )

            runOnUiThread {

                result.onSuccess { reservations ->

                    displayReservations(
                        reservations
                    )

                }.onFailure { error ->

                    statusText.text =
                        error.message
                            ?: "Unable to load approved reservations."
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
                "You do not have any approved reservations."

            return
        }

        statusText.text =
            "${reservations.size} approved reservation(s)"

        reservations.forEach { reservation ->

            addReservationCard(reservation)
        }
    }

    private fun addReservationCard(
        reservation: ReservationApi.Reservation
    ) {

        val card = LinearLayout(this)

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

        val title = TextView(this)

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

        val idText = TextView(this)

        idText.text =
            "Reservation ID: ${reservation.id}"

        idText.textSize = 14f

        card.addView(idText)

        val time = TextView(this)

        time.text =
            "Time: ${reservation.startTime} - " +
                    reservation.endTime

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

        val qrButton = Button(this)

        qrButton.text =
            "View Transaction QR"

        qrButton.setOnClickListener {

            val intent =
                Intent(
                    this,
                    TransactionQrActivity::class.java
                )

            intent.putExtra(
                "reservationId",
                reservation.id
            )

            startActivity(intent)
        }

        card.addView(qrButton)

        reservationsContainer.addView(card)
    }
}