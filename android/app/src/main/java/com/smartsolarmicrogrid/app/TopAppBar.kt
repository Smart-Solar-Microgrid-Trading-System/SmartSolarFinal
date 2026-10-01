package com.smartsolarmicrogrid.app

import android.app.Activity
import android.widget.ImageButton
import android.widget.TextView

object TopAppBar {
    fun configure(activity: Activity, title: String) {
        activity.findViewById<TextView>(R.id.topBarTitleText).text = title

        activity.findViewById<ImageButton>(R.id.pageBackButton).setOnClickListener {
            activity.finish()
        }
    }
}
