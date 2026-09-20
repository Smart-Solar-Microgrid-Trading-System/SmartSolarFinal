package com.smartsolarmicrogrid.app

import android.app.Activity
import android.os.Bundle

class OperationsActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_operations)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        AppNavigation.configure(this, AppNavigation.Destination.Operations)
    }
}
