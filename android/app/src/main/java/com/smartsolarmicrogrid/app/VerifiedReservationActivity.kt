package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.graphics.Typeface
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class VerifiedReservationsActivity : Activity() {

    private lateinit var statusText: TextView
    private lateinit var reservationsContainer: LinearLayout

    private var token: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_verified_reservations
        )

        statusText = findViewById(R.id.statusText)

        reservationsContainer =
            findViewById(R.id.reservationsContainer)

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

        token =
            session?.token.orEmpty()
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

                result
                    .onSuccess { reservations ->

                        displayReservations(
                            reservations
                        )
                    }
                    .onFailure { error ->

                        statusText.text =
                            error.message
                                ?: "Unable to load approved reservations."
                    }
            }

        }.start()
    }

    private fun displayReservations(
        reservations: List<ReservationApi.Reservation>
    ) {

        reservationsContainer.removeAllViews()

        if (reservations.isEmpty()) {

            statusText.text =
                "There are no approved reservations."

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
            dp(18),
            dp(16),
            dp(18),
            dp(16)
        )

        card.setBackgroundResource(
            R.drawable.dashboard_card
        )

        // small gap between the lines inside the card
        card.dividerDrawable =
            getDrawable(R.drawable.card_spacing)

        card.showDividers =
            LinearLayout.SHOW_DIVIDER_MIDDLE

        val params = LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        )

        params.setMargins(
            0,
            0,
            0,
            dp(14)
        )

        card.layoutParams = params

        val title = TextView(this)

        title.text =
            reservation.nodeName
                .ifBlank { "Unknown Station" }

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

        idText.setTextColor(
            getColor(R.color.text_secondary)
        )

        card.addView(idText)

        val prosumer = TextView(this)

        prosumer.text =
            "Prosumer: ${reservation.prosumerName}\n" +
                    "NIC: ${reservation.prosumerNic}"

        prosumer.textSize = 16f

        card.addView(prosumer)

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

        // --------------------------------------------------------
        // FINALIZE TRANSFER
        // This starts the QR verification path.
        // --------------------------------------------------------

        val finalizeButton = Button(this, null, 0, R.style.PrimaryButton)

        finalizeButton.text =
            "Finalize Transfer"

        finalizeButton.setOnClickListener {

            openScanner(
                reservation.id
            )
        }
        card.addView(finalizeButton)

        reservationsContainer.addView(card)
    }



    private fun openScanner(
        reservationId: String
    ) {

        val intent =
            Intent(
                this,
                QrScannerActivity::class.java
            )

        intent.putExtra(
            "expectedReservationId",
            reservationId
        )

        intent.putExtra(
            "token",
            token
        )

        startActivity(intent)
    }

    private fun dp(value: Int) =
        (value * resources.displayMetrics.density).toInt()
}