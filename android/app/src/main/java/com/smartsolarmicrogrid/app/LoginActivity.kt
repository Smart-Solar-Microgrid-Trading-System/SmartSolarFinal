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

class LoginActivity : Activity() {
    private lateinit var identifierInput: EditText
    private lateinit var passwordInput: EditText
    private lateinit var feedbackText: TextView
    private lateinit var loginButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        identifierInput = findViewById(R.id.identifierInput)
        passwordInput = findViewById(R.id.passwordInput)
        feedbackText = findViewById(R.id.feedbackText)
        loginButton = findViewById(R.id.loginButton)
        loginButton.setOnClickListener { login() }
        findViewById<Button>(R.id.registerButton).setOnClickListener {
            startActivity(Intent(this, ProsumerRegistrationActivity::class.java))
        }
        findViewById<TextView>(R.id.settingsButton).setOnClickListener {
            startActivity(Intent(this, ServerSettingsActivity::class.java).apply {
                putExtra("opened_from_home", true)
            })
        }
    }

    private fun login() {
        val identifier = identifierInput.text.toString().trim()
        val password = passwordInput.text.toString()
        if (identifier.isBlank() || password.isBlank()) {
            showFeedback("Enter your NIC/username and password.", false)
            return
        }
        loginButton.isEnabled = false
        showFeedback("Signing in ...", null)
        Thread {
            val result = ApiClient.post(this, "/api/auth/login", JSONObject().apply {
                put("identifier", identifier)
                put("password", password)
            })
            if (result.statusCode == 200) {
                val response = JSONObject(result.body)
                SessionDatabaseHelper(this).apply {
                    clearProfile()
                    saveSession(
                    response.getString("token"), response.getString("role"), response.getString("name")
                    )
                }
                runOnUiThread {
                    startActivity(Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP))
                    finish()
                }
            } else {
                val error = ApiClient.errorMessage(result, "Sign-in failed.")
                showFeedback(error, false)
                runOnUiThread { loginButton.isEnabled = true }
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
