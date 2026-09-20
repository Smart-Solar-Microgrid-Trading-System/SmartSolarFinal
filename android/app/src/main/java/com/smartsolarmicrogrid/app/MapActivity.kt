package com.smartsolarmicrogrid.app

import android.app.Activity
import android.os.Bundle

class MapActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_map)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        AppNavigation.configure(this, AppNavigation.Destination.Map)
    }
}
