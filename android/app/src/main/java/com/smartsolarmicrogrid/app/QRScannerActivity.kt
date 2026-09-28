package com.smartsolarmicrogrid.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

class QrScannerActivity : AppCompatActivity() {

    private lateinit var cameraPreview: PreviewView
    private lateinit var scannerStatus: TextView

    private val cameraExecutor = Executors.newSingleThreadExecutor()

    private val scanned = AtomicBoolean(false)

    private val cameraPermissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestPermission()
        ) { granted ->

            if (granted) {
                startCamera()
            } else {
                scannerStatus.text =
                    "Camera permission is required to scan a booking QR."
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_qr_scanner)

        cameraPreview = findViewById(R.id.cameraPreview)

        scannerStatus = findViewById(R.id.scannerStatus)

        checkCameraPermission()
    }

    private fun checkCameraPermission() {

        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        ) {

            startCamera()

        } else {

            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
    }

    @OptIn(ExperimentalGetImage::class)
    private fun startCamera() {

        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({

            val cameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                    .build()
                    .also {
                        it.surfaceProvider = cameraPreview.surfaceProvider
                    }

            val barcodeScanner = BarcodeScanning.getClient()

            val imageAnalysis = ImageAnalysis.Builder()
                    .setBackpressureStrategy(
                        ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST
                    )
                    .build()

            imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->

                val mediaImage = imageProxy.image

                if (mediaImage == null) {
                    imageProxy.close()
                    return@setAnalyzer
                }

                val image = InputImage.fromMediaImage(
                    mediaImage,
                    imageProxy.imageInfo.rotationDegrees
                )

                barcodeScanner.process(image)
                    .addOnSuccessListener { barcodes ->

                        if (scanned.get()) {
                            return@addOnSuccessListener
                        }

                        for (barcode in barcodes) {

                            val rawValue =
                                barcode.rawValue
                                    ?: continue

                            if (rawValue.isBlank()) {
                                continue
                            }

                            if (
                                barcode.format ==
                                com.google.mlkit.vision.barcode.common.Barcode.FORMAT_QR_CODE
                            ) {

                                if (
                                    scanned.compareAndSet(false, true)
                                ) {

                                    runOnUiThread { handleQrResult(rawValue)
                                    }

                                    break
                                }
                            }
                        }
                    }
                    .addOnFailureListener {
                        // Keep scanning.
                    }
                    .addOnCompleteListener {
                        imageProxy.close()
                    }
            }

            try {

                cameraProvider.unbindAll()

                cameraProvider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    imageAnalysis
                )

            } catch (e: Exception) {

                scannerStatus.text = "Unable to start camera: ${e.message}"
            }

        }, ContextCompat.getMainExecutor(this))
    }

    private fun handleQrResult(rawValue: String) {

        scannerStatus.text =
            "QR detected. Verifying transaction..."

        val transactionToken =
            TransactionApi.extractTransactionToken(rawValue)

        if (transactionToken.isNullOrBlank()) {

            scannerStatus.text =
                "Invalid transaction QR code."

            scanned.set(false)

            return
        }

        val session =
            SessionDatabaseHelper(this).getSession()

        val token =
            session?.token.orEmpty()

        if (token.isBlank()) {

            scannerStatus.text =
                "Your session has expired. Please log in again."

            scanned.set(false)

            return
        }

        val intent =
            Intent(
                this,
                BookingVerificationActivity::class.java
            )

        intent.putExtra(
            "transactionToken",
            transactionToken
        )

        startActivity(intent)

        finish()
    }
    override fun onDestroy() {

        super.onDestroy()

        cameraExecutor.shutdown()
    }
}


