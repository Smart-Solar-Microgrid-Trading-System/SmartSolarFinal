package com.smartsolarmicrogrid.app

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.widget.ImageView
import android.widget.TextView
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.common.BitMatrix
import kotlin.concurrent.thread

class TransactionQrActivity : Activity() {

    private lateinit var transactionQrImage: ImageView
    private lateinit var transactionStatusText: TextView
    private lateinit var reservationIdText: TextView

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {
        super.onCreate(savedInstanceState)

        setContentView(
            R.layout.activity_transaction_qr
        )

        transactionQrImage =
            findViewById(
                R.id.transactionQrImage
            )

        transactionStatusText =
            findViewById(
                R.id.transactionStatusText
            )

        reservationIdText =
            findViewById(
                R.id.reservationIdText
            )

        TopAppBar.configure(this, "Transaction QR")

        val reservationId =
            intent.getStringExtra(
                "reservationId"
            ).orEmpty()

        if (reservationId.isBlank()) {

            transactionStatusText.text =
                "Reservation information is missing."

            return
        }

        reservationIdText.text =
            "Reservation: $reservationId"

        loadTransactionQr(
            reservationId
        )
    }

    private fun loadTransactionQr(
        reservationId: String
    ) {

        val session =
            SessionDatabaseHelper(this)
                .getSession()

        val token =
            session?.token.orEmpty()

        if (token.isBlank()) {

            transactionStatusText.text =
                "Your session has expired. Please log in again."

            return
        }

        transactionStatusText.text =
            "Preparing secure transaction QR..."

        thread {

            val result =
                TransactionApi.generateQr(
                    this,
                    token,
                    reservationId
                )

            runOnUiThread {

                result.fold(

                    onSuccess = { response ->

                        /*
                         * qrPayload is the complete value that
                         * must be encoded into the QR.
                         *
                         * Example:
                         *
                         * SMARTSOLAR|TX|8f3a...
                         */
                        val qrPayload =
                            response.qrPayload

                        if (qrPayload.isBlank()) {

                            transactionStatusText.text =
                                "The server did not return a QR payload."

                            return@fold
                        }

                        displayQr(
                            qrPayload
                        )
                    },

                    onFailure = { error ->

                        transactionStatusText.text =
                            error.message
                                ?: "Unable to generate transaction QR."
                    }
                )
            }
        }
    }

    private fun displayQr(
        payload: String
    ) {

        try {

            val size = 800

            val bitMatrix: BitMatrix =
                MultiFormatWriter().encode(
                    payload,
                    BarcodeFormat.QR_CODE,
                    size,
                    size
                )

            val bitmap =
                Bitmap.createBitmap(
                    size,
                    size,
                    Bitmap.Config.RGB_565
                )

            for (x in 0 until size) {

                for (y in 0 until size) {

                    bitmap.setPixel(
                        x,
                        y,
                        if (bitMatrix[x, y]) {
                            Color.BLACK
                        } else {
                            Color.WHITE
                        }
                    )
                }
            }

            transactionQrImage.setImageBitmap(
                bitmap
            )

            transactionStatusText.text =
                "Show this QR code to the Grid Operator."

        } catch (e: Exception) {

            transactionStatusText.text =
                "Unable to create QR code: ${e.message}"
        }
    }
}

