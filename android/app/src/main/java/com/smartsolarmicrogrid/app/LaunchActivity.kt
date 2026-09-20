package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper

class LaunchActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_launch)

        Handler(Looper.getMainLooper()).postDelayed({
            val savedAddress = getSharedPreferences(PREFERENCES_NAME, MODE_PRIVATE)
                .getString(API_URL_KEY, "")
                .orEmpty()
                .trim()

            val nextScreen = when {
                savedAddress.isBlank() -> ServerSettingsActivity::class.java
                SessionDatabaseHelper(this).hasSession() -> MainActivity::class.java
                else -> LoginActivity::class.java
            }

            startActivity(Intent(this, nextScreen))
            finish()
        }, LAUNCH_DELAY_MILLISECONDS)
    }

    private companion object {
        const val PREFERENCES_NAME = "smart_solar_microgrid_preferences"
        const val API_URL_KEY = "api_url"
        const val LAUNCH_DELAY_MILLISECONDS = 1_200L
    }
}
