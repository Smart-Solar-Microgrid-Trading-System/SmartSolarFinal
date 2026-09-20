package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.view.View
import android.widget.Button

object AppNavigation {
    fun openHome(activity: Activity) = activity.startActivity(
        Intent(activity, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
    )

    fun openBookings(activity: Activity) = activity.startActivity(Intent(activity, BookingsActivity::class.java))

    fun openProfile(activity: Activity) = activity.startActivity(Intent(activity, ProfileActivity::class.java))

    fun openMap(activity: Activity) = activity.startActivity(Intent(activity, MapActivity::class.java))

    fun openOperations(activity: Activity) = activity.startActivity(Intent(activity, OperationsActivity::class.java))

    fun configure(activity: Activity, current: Destination) {
        val isGridOperator = SessionDatabaseHelper(activity).getSession()?.role == "GridOperator"
        val bookings = activity.findViewById<Button>(R.id.bookingsNavigationButton)
        val map = activity.findViewById<Button>(R.id.mapNavigationButton)
        val operations = activity.findViewById<Button>(R.id.operationsNavigationButton)

        bookings.visibility = if (isGridOperator) View.GONE else View.VISIBLE
        map.visibility = if (isGridOperator) View.GONE else View.VISIBLE
        operations.visibility = if (isGridOperator) View.VISIBLE else View.GONE

        activity.findViewById<Button>(R.id.homeNavigationButton).apply {
            isEnabled = current != Destination.Home
            setOnClickListener { if (current != Destination.Home) openHome(activity) }
        }
        bookings.apply {
            isEnabled = current != Destination.Bookings
            setOnClickListener { if (current != Destination.Bookings) openBookings(activity) }
        }
        map.apply {
            isEnabled = current != Destination.Map
            setOnClickListener { if (current != Destination.Map) openMap(activity) }
        }
        operations.apply {
            isEnabled = current != Destination.Operations
            setOnClickListener { if (current != Destination.Operations) openOperations(activity) }
        }
        activity.findViewById<Button>(R.id.profileNavigationButton).apply {
            isEnabled = current != Destination.Profile
            setOnClickListener { if (current != Destination.Profile) openProfile(activity) }
        }
    }

    enum class Destination { Home, Bookings, Map, Operations, Profile }
}
