package com.smartsolarmicrogrid.app

import android.app.Activity
import android.os.Bundle
import android.widget.Button

class BookingsActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookings)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        AppNavigation.configure(this, AppNavigation.Destination.Bookings)
    }
}
