package com.smartsolarmicrogrid.app

import android.app.Activity
import android.content.Intent
import android.view.View
import android.widget.Button

object AppNavigation {

    fun openHome(activity: Activity) {
        open(
            activity,
            MainActivity::class.java
        )
    }

    fun openBookings(activity: Activity) {
        open(
            activity,
            BookingsActivity::class.java
        )
    }

    fun openProfile(activity: Activity) {
        open(
            activity,
            ProfileActivity::class.java
        )
    }

    fun openMap(activity: Activity) {
        open(
            activity,
            MapActivity::class.java
        )
    }

    fun openOperations(activity: Activity) {
        open(
            activity,
            OperationsActivity::class.java
        )
    }

    private fun open(
        activity: Activity,
        destination: Class<*>
    ) {

        val intent =
            Intent(
                activity,
                destination
            ).apply {

                addFlags(
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                )
            }

        activity.startActivity(intent)
    }

    fun configure(
        activity: Activity,
        current: Destination
    ) {

        val session =
            SessionDatabaseHelper(activity)
                .getSession()

        val isGridOperator =
            session?.role == "GridOperator"

        val home =
            activity.findViewById<Button>(
                R.id.homeNavigationButton
            )

        val bookings =
            activity.findViewById<Button>(
                R.id.bookingsNavigationButton
            )

        val map =
            activity.findViewById<Button>(
                R.id.mapNavigationButton
            )

        val operations =
            activity.findViewById<Button>(
                R.id.operationsNavigationButton
            )

        val profile =
            activity.findViewById<Button>(
                R.id.profileNavigationButton
            )

        /*
         * Prosumer:
         * Home / Bookings / Map / Profile
         *
         * Grid Operator:
         * Home / Map / Operations / Profile
         */
        bookings.visibility =
            if (isGridOperator) {
                View.GONE
            } else {
                View.VISIBLE
            }

        operations.visibility =
            if (isGridOperator) {
                View.VISIBLE
            } else {
                View.GONE
            }

        map.visibility =
            View.VISIBLE

        configureButton(
            home,
            current == Destination.Home
        ) {
            openHome(activity)
        }

        configureButton(
            bookings,
            current == Destination.Bookings
        ) {
            openBookings(activity)
        }

        configureButton(
            map,
            current == Destination.Map
        ) {
            openMap(activity)
        }

        configureButton(
            operations,
            current == Destination.Operations
        ) {
            openOperations(activity)
        }

        configureButton(
            profile,
            current == Destination.Profile
        ) {
            openProfile(activity)
        }
    }

    private fun configureButton(
        button: Button,
        selected: Boolean,
        action: () -> Unit
    ) {

        button.isEnabled =
            !selected

        button.setOnClickListener {

            if (!selected) {
                action()
            }
        }
    }

    enum class Destination {
        Home,
        Bookings,
        Map,
        Operations,
        Profile
    }
}