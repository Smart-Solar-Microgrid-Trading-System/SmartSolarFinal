package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import org.json.JSONObject

class ProsumerRegistrationActivity : Activity() {
    private lateinit var nicInput: EditText
    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var feedbackText: TextView
    private lateinit var registerButton: Button
    private lateinit var registrationForm: View
    private lateinit var registrationSuccessPanel: View

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_prosumer_registration)
        nicInput = findViewById(R.id.nicInput)
        nameInput = findViewById(R.id.nameInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        passwordInput = findViewById(R.id.passwordInput)
        feedbackText = findViewById(R.id.feedbackText)
        registerButton = findViewById(R.id.registerButton)
        registrationForm = findViewById(R.id.registrationForm)
        registrationSuccessPanel = findViewById(R.id.registrationSuccessPanel)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        registerButton.setOnClickListener { register() }
        findViewById<Button>(R.id.backToSignInButton).setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP))
            finish()
        }
    }

    private fun register() {
        val nic = nicInput.text.toString().trim()
        val name = nameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (nic.isBlank() || name.isBlank() || email.isBlank() || password.isBlank()) {
            showFeedback("NIC, full name, email, and password are required.", false)
            return
        }
        registerButton.isEnabled = false
        showFeedback("Creating your Prosumer account ...", null)
        Thread {
            val result = ApiClient.post(this, "/api/prosumers/register", JSONObject().apply {
                put("nic", nic)
                put("fullName", name)
                put("email", email)
                put("phone", phone)
                put("password", password)
            })
            if (result.statusCode == 201) {
                runOnUiThread {
                    registrationForm.visibility = View.GONE
                    feedbackText.visibility = View.GONE
                    registrationSuccessPanel.visibility = View.VISIBLE
                }
            } else {
                val error = ApiClient.errorMessage(result, "Registration failed.")
                showFeedback(error, false)
                runOnUiThread { registerButton.isEnabled = true }
            }
        }.start()
    }

    private fun showFeedback(message: String, successful: Boolean?) = runOnUiThread {
        feedbackText.visibility = View.VISIBLE
        feedbackText.text = message
        feedbackText.setTextColor(when (successful) {
            true -> getColor(R.color.status_success)
            false -> getColor(R.color.status_error)
            null -> Color.DKGRAY
        })
    }
}
