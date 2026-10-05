package com.smartsolarmicrogrid.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject

class ProfileActivity : Activity() {
    private val phonePattern = Regex("""^(?:07\d{8}|\+947\d{8})$""")
    private lateinit var nameInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var feedbackText: TextView
    private lateinit var passwordFeedbackText: TextView
    private lateinit var saveButton: Button
    private lateinit var deactivateButton: Button
    private var session: SessionDatabaseHelper.MobileSession? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        setContentView(R.layout.activity_profile)
            findViewById<android.widget.ImageButton>(
            R.id.pageBackButton
        ).setOnClickListener {
            AppNavigation.openHome(this)
        }
        nameInput = findViewById(R.id.nameInput)
        emailInput = findViewById(R.id.emailInput)
        phoneInput = findViewById(R.id.phoneInput)
        feedbackText = findViewById(R.id.feedbackText)
        passwordFeedbackText = findViewById(R.id.passwordFeedbackText)
        saveButton = findViewById(R.id.saveButton)
        deactivateButton = findViewById(R.id.deactivateButton)
        session = SessionDatabaseHelper(this).getSession()
        if (session == null) {
            returnToLogin()
            return
        }

        AppNavigation.configure(this, AppNavigation.Destination.Profile)
        findViewById<Button>(R.id.changePasswordButton).setOnClickListener { changePassword() }
        saveButton.setOnClickListener { updateProfile() }
        deactivateButton.setOnClickListener { showDeactivationConfirmation() }

        if (session?.role == "GridOperator") {
            saveButton.visibility = View.GONE
            deactivateButton.visibility = View.GONE
            listOf(nameInput, emailInput, phoneInput).forEach { input ->
                input.keyListener = null
                input.isFocusable = false
                input.isFocusableInTouchMode = false
                input.isClickable = false
                input.isCursorVisible = false
            }
        }
        SessionDatabaseHelper(this).getProfile()?.let { cached ->
            nameInput.setText(cached.fullName)
            emailInput.setText(cached.email)
            phoneInput.setText(cached.phone)
        }
        loadProfile()
    }

    private fun changePassword() {
        val token = session?.token
        if (token == null) {
            returnToLogin()
            return
        }
        val currentInput = findViewById<EditText>(R.id.currentPasswordInput)
        val newInput = findViewById<EditText>(R.id.newPasswordInput)
        val confirmInput = findViewById<EditText>(R.id.confirmNewPasswordInput)
        val current = currentInput.text.toString()
        val newPassword = newInput.text.toString()
        val confirm = confirmInput.text.toString()
        val error = when {
            current.isBlank() -> "Enter your current password."
            newPassword.isBlank() || newPassword.length !in 8..72 -> "New password must be 8-72 characters."
            newPassword.toByteArray(Charsets.UTF_8).size > 72 -> "New password must not exceed 72 UTF-8 bytes."
            newPassword != confirm -> "New passwords must match."
            newPassword == current -> "Choose a different new password."
            else -> null
        }
        if (error != null) {
            showPasswordFeedback(error, false)
            return
        }
        val button = findViewById<Button>(R.id.changePasswordButton)
        button.isEnabled = false
        showPasswordFeedback("Changing password ...", null)
        Thread {
            val result = ApiClient.request(this, "POST", "/api/auth/change-password", JSONObject().apply {
                put("currentPassword", current)
                put("newPassword", newPassword)
                put("confirmNewPassword", confirm)
            }, token)
            runOnUiThread {
                button.isEnabled = true
                if (result.statusCode == 200 || result.statusCode == 401) {
                    currentInput.text.clear()
                    newInput.text.clear()
                    confirmInput.text.clear()
                    SessionDatabaseHelper(this).clearSession()
                    SessionDatabaseHelper(this).clearProfile()
                    val message = if (result.statusCode == 200) "Password changed. Sign in with your new password." else "Session expired. Please sign in again."
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                    startActivity(Intent(this, LoginActivity::class.java).addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK))
                    finish()
                } else {
                    showPasswordFeedback(ApiClient.errorMessage(result, "Password change failed."), false)
                }
            }
        }.start()
    }

    private fun loadProfile() {
        val token = session?.token ?: run {
            returnToLogin()
            return
        }
        showProfileFeedback("Loading profile ...", null)
        Thread {
            try {
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
                    if (session?.role == "GridOperator") {
                        showProfileFeedback(
                            "Grid Operator profile details are read-only. You can change your password below.",
                            null
                        )
                    } else {
                        showProfileFeedback("Profile loaded.", true)
                    }
                } else if (result.statusCode == 401) {
                    returnToLogin()
                } else {
                    showProfileFeedback(ApiClient.errorMessage(result, "Profile could not be loaded."), false)
                }
            } catch (_: Exception) {
                showProfileFeedback("The server returned an invalid profile response.", false)
            }
        }.start()
    }

    private fun updateProfile() {
        val token = session?.token
        if (token == null) {
            returnToLogin()
            return
        }
        val name = nameInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        if (name.isBlank()) {
            showProfileFeedback("Full name is required.", false)
            return
        }
        if (email.isBlank()) {
            showProfileFeedback("Email is required.", false)
            return
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            showProfileFeedback("Enter a valid email address.", false)
            return
        }
        if (phone.isNotBlank() && !phonePattern.matches(phone)) {
            showProfileFeedback("Enter a Sri Lankan mobile number as 07XXXXXXXX or +947XXXXXXXX.", false)
            return
        }
        saveButton.isEnabled = false
        showProfileFeedback("Saving profile ...", null)
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
                runOnUiThread {
                    saveButton.isEnabled = true
                    showProfileFeedback("Profile updated.", true)
                }
            } else if (result.statusCode == 401) {
                runOnUiThread {
                    saveButton.isEnabled = true
                    returnToLogin()
                }
            } else {
                runOnUiThread {
                    saveButton.isEnabled = true
                    showProfileFeedback(ApiClient.errorMessage(result, "Profile update failed."), false)
                }
            }
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
        val token = session?.token ?: run {
            returnToLogin()
            return
        }
        deactivateButton.isEnabled = false
        showProfileFeedback("Deactivating account ...", null)
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
            } else if (result.statusCode == 401) {
                returnToLogin()
            } else {
                runOnUiThread {
                    deactivateButton.isEnabled = true
                    showProfileFeedback(ApiClient.errorMessage(result, "Account deactivation failed."), false)
                }
            }
        }.start()
    }

    private fun JSONObject.optionalText(key: String): String {
        val value = opt(key)
        return if (value == null || value == JSONObject.NULL) "" else value.toString()
    }

    private fun showProfileFeedback(message: String, successful: Boolean?) = runOnUiThread {
        feedbackText.visibility = View.VISIBLE
        feedbackText.text = message
        feedbackText.setTextColor(when (successful) { true -> getColor(R.color.status_success); false -> getColor(R.color.status_error); null -> Color.DKGRAY })
    }

    private fun showPasswordFeedback(message: String, successful: Boolean?) = runOnUiThread {
        passwordFeedbackText.visibility = View.VISIBLE
        passwordFeedbackText.text = message
        passwordFeedbackText.setTextColor(when (successful) { true -> getColor(R.color.status_success); false -> getColor(R.color.status_error); null -> Color.DKGRAY })
    }

    private fun returnToLogin() = runOnUiThread {
        SessionDatabaseHelper(this).clearSession()
        SessionDatabaseHelper(this).clearProfile()
        Toast.makeText(this, "Session expired. Please sign in again.", Toast.LENGTH_LONG).show()
        startActivity(
            Intent(this, LoginActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            )
        )
        finish()
    }
}
