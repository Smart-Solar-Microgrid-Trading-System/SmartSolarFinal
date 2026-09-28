package com.smartsolarmicrogrid.app

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class BookingVerificationActivity :
    AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var reservationIdText: TextView
    private lateinit var prosumerText: TextView
    private lateinit var nodeText: TextView
    private lateinit var slotText: TextView
    private lateinit var energyText: TextView
    private lateinit var bookingStatusText: TextView
    private lateinit var finalizeButton: Button
    private lateinit var scanAnotherButton: Button

    private var transactionToken: String = ""
    private var token: String = ""

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_booking_verification
        )

        initializeViews()

        transactionToken =
            intent.getStringExtra(
                "transactionToken"
            ) ?: ""

        val session =
            SessionDatabaseHelper(this).getSession()

        token =
            session?.token.orEmpty()

        scanAnotherButton.setOnClickListener {
            openScanner()
        }

        finalizeButton.setOnClickListener {
            finalizeTransfer()
        }

        if (
            transactionToken.isBlank() ||
            token.isBlank()
        ) {
            showError(
                "Missing transaction or authentication information."
            )
            return
        }

        verifyBooking()
    }

    private fun initializeViews() {

        statusText =
            findViewById(
                R.id.statusText
            )

        reservationIdText =
            findViewById(
                R.id.reservationIdText
            )

        prosumerText =
            findViewById(
                R.id.prosumerText
            )

        nodeText =
            findViewById(
                R.id.nodeText
            )

        slotText =
            findViewById(
                R.id.slotText
            )

        energyText =
            findViewById(
                R.id.energyText
            )

        bookingStatusText =
            findViewById(
                R.id.bookingStatusText
            )

        finalizeButton =
            findViewById(
                R.id.finalizeButton
            )

        scanAnotherButton =
            findViewById(
                R.id.scanAnotherButton
            )
    }

    private fun verifyBooking() {

        setLoading(true)

        statusText.text =
            "Verifying booking against server..."

        Thread {

            val result =
                TransactionApi.verify(
                    this,
                    token,
                    transactionToken
                )

            runOnUiThread {

                setLoading(false)

                result
                    .onSuccess { verification ->

                        if (!verification.valid) {

                            showError(
                                verification.message
                            )

                            return@onSuccess
                        }

                        displayBooking(
                            verification
                        )

                        /*
                         * Keep track of the verified
                         * reservation locally.
                         */
                        VerifiedReservationStore
                            .markVerified(
                                this,
                                verification.reservationId
                            )
                    }

                    .onFailure { error ->

                        showError(
                            error.message
                                ?: "Unable to verify booking."
                        )
                    }
            }

        }.start()
    }

    private fun displayBooking(
        booking:
        TransactionApi.Verification
    ) {

        statusText.text =
            booking.message

        reservationIdText.text =
            "Reservation ID: ${booking.reservationId}"

        prosumerText.text =
            "Prosumer: ${booking.prosumerName}\n" +
                    "NIC: ${booking.prosumerNic}"

        nodeText.text =
            "Station: ${booking.nodeName}"

        slotText.text =
            "Time: ${booking.startTime} - ${booking.endTime}"

        energyText.text =
            "Energy: ${booking.energyAmountKw} kW"

        bookingStatusText.text =
            "Booking Status: ${booking.status}"

        finalizeButton.isEnabled =
            booking.valid &&
                    isFinalizableStatus(
                        booking.status
                    )
    }

    private fun isFinalizableStatus(
        status: String
    ): Boolean {

        return when (
            status.uppercase()
        ) {

            "APPROVED",
            "CONFIRMED",
            "READY" -> true

            else -> false
        }
    }

    private fun finalizeTransfer() {

        finalizeButton.isEnabled =
            false

        statusText.text =
            "Finalizing energy transfer..."

        Thread {

            val result =
                TransactionApi.finalizeTransfer(
                    this,
                    token,
                    transactionToken
                )

            runOnUiThread {

                result
                    .onSuccess { response ->

                        if (!response.success) {

                            showError(
                                response.message
                            )

                            finalizeButton.isEnabled =
                                true

                            return@onSuccess
                        }

                        VerifiedReservationStore
                            .removeVerified(
                                this,
                                response.reservationId
                            )

                        val intent =
                            Intent(
                                this,
                                TransferCompleteActivity::class.java
                            )

                        intent.putExtra(
                            "reservationId",
                            response.reservationId
                        )

                        intent.putExtra(
                            "message",
                            response.message
                        )

                        startActivity(intent)

                        finish()
                    }

                    .onFailure { error ->

                        showError(
                            error.message
                                ?: "Unable to finalize transfer."
                        )

                        finalizeButton.isEnabled =
                            true
                    }
            }

        }.start()
    }

    private fun openScanner() {

        val intent =
            Intent(
                this,
                QrScannerActivity::class.java
            )

        startActivity(intent)

        finish()
    }

    private fun showError(
        message: String
    ) {

        statusText.text =
            message

        finalizeButton.isEnabled =
            false
    }

    private fun setLoading(
        loading: Boolean
    ) {

        finalizeButton.isEnabled =
            !loading

        scanAnotherButton.isEnabled =
            !loading
    }
}