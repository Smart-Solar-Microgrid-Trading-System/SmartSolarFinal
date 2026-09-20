package com.smartsolarmicrogrid.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject

class ProfileActivity : Activity() {
    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var feedbackText: TextView
    private lateinit var saveButton: Button
    private lateinit var deactivateButton: Button
    private var session: SessionDatabaseHelper.MobileSession? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_profile)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        nameInput = findViewById(R.id.nameInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        feedbackText = findViewById(R.id.feedbackText)
        saveButton = findViewById(R.id.saveButton)
        deactivateButton = findViewById(R.id.deactivateButton)
        session = SessionDatabaseHelper(this).getSession()

        AppNavigation.configure(this, AppNavigation.Destination.Profile)
        saveButton.setOnClickListener { updateProfile() }
        deactivateButton.setOnClickListener { showDeactivationConfirmation() }

        if (session?.role != "Prosumer") {
            saveButton.visibility = View.GONE
            deactivateButton.visibility = View.GONE
            showFeedback("Grid Operator profile is read-only in the current account-management scope.", null)
        }
        SessionDatabaseHelper(this).getProfile()?.let { cached ->
            nameInput.setText(cached.fullName)
            emailInput.setText(cached.email)
            phoneInput.setText(cached.phone)
        }
        loadProfile()
    }

    private fun loadProfile() {
        val token = session?.token ?: return
        showFeedback("Loading profile ...", null)
        Thread {
            val result = ApiClient.request(this, "GET", "/api/users/me", token = token)
            if (result.statusCode == 200) {
                val profile = JSONObject(result.body)
                val cachedProfile = SessionDatabaseHelper.CachedProfile(
                    id = profile.optString("id"),
                    fullName = profile.optString("fullName"),
                    email = profile.optionalText("email"),
                    phone = profile.optionalText("phone"),
                    role = profile.optString("role"),
                    updatedAt = profile.optString("updatedAt")
                )
                SessionDatabaseHelper(this).saveProfile(cachedProfile)
                runOnUiThread {
                    nameInput.setText(cachedProfile.fullName)
                    emailInput.setText(cachedProfile.email)
                    phoneInput.setText(cachedProfile.phone)
                }
                showFeedback("Profile loaded.", true)
            } else showFeedback(ApiClient.errorMessage(result, "Profile could not be loaded."), false)
        }.start()
    }

    private fun updateProfile() {
        val token = session?.token ?: return
        val name = nameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        if (name.isBlank() || email.isBlank()) {
            showFeedback("Full name and email are required.", false)
            return
        }
        Thread {
            val result = ApiClient.request(this, "PUT", "/api/users/me", JSONObject().apply {
                put("fullName", name); put("email", email); put("phone", phone)
            }, token)
            if (result.statusCode == 200) {
                val updated = JSONObject(result.body)
                SessionDatabaseHelper(this).saveProfile(
                    SessionDatabaseHelper.CachedProfile(
                        updated.optString("id"), updated.optString("fullName"), updated.optionalText("email"),
                        updated.optionalText("phone"), updated.optString("role"), updated.optString("updatedAt")
                    )
                )
                showFeedback("Profile updated.", true)
            } else showFeedback(ApiClient.errorMessage(result, "Profile update failed."), false)
        }.start()
    }

    private fun showDeactivationConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Deactivate account?")
            .setMessage("You will be signed out. Only Backoffice can reactivate your account.")
            .setNegativeButton("Cancel", null)
            .setPositiveButton("Deactivate account") { _, _ -> requestDeactivation() }
            .show()
    }

    private fun requestDeactivation() {
        val token = session?.token ?: return
        Thread {
            val result = ApiClient.request(this, "POST", "/api/users/me/deactivation-request", JSONObject(), token)
            if (result.statusCode == 200) {
                SessionDatabaseHelper(this).clearSession()
                SessionDatabaseHelper(this).clearProfile()
                runOnUiThread {
                    Toast.makeText(this, "Account deactivated. Backoffice must reactivate it before you can sign in again.", Toast.LENGTH_LONG).show()
                    startActivity(
                        Intent(this, LoginActivity::class.java).addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                        )
                    )
                    finish()
                }
            } else showFeedback(ApiClient.errorMessage(result, "Account deactivation failed."), false)
        }.start()
    }

    private fun JSONObject.optionalText(key: String): String {
        val value = opt(key)
        return if (value == null || value == JSONObject.NULL) "" else value.toString()
    }

    private fun showFeedback(message: String, successful: Boolean?) = runOnUiThread {
        feedbackText.visibility = View.VISIBLE
        feedbackText.text = message
        feedbackText.setTextColor(when (successful) { true -> getColor(R.color.status_success); false -> getColor(R.color.status_error); null -> Color.DKGRAY })
    }
}
