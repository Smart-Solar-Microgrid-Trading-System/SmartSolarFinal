package com.smartsolarmicrogrid.app

import android.content.Context

object VerifiedReservationStore {

    private const val PREF_NAME = "verified_reservations"

    private const val KEY_IDS = "reservation_ids"

    private fun preferences(context: Context) =
        context.getSharedPreferences(
            PREF_NAME,
            Context.MODE_PRIVATE
        )

    fun markVerified(
        context: Context,
        reservationId: String
    ) {

        val ids = getVerifiedIds(context).toMutableSet()

        ids.add(reservationId)

        preferences(context)
            .edit()
            .putStringSet(KEY_IDS, ids)
            .apply()
    }

    fun isVerified(
        context: Context,
        reservationId: String
    ): Boolean {

        return getVerifiedIds(context)
            .contains(reservationId)
    }

    fun getVerifiedIds(
        context: Context
    ): Set<String> {

        return preferences(context)
            .getStringSet(
                KEY_IDS,
                emptySet()
            )
            ?.toSet()
            ?: emptySet()
    }

    fun removeVerified(
        context: Context,
        reservationId: String
    ) {

        val ids =
            getVerifiedIds(context).toMutableSet()

        ids.remove(reservationId)

        preferences(context)
            .edit()
            .putStringSet(KEY_IDS, ids)
            .apply()
    }

    fun clear(
        context: Context
    ) {

        preferences(context).edit()
            .remove(KEY_IDS)
            .apply()
    }
}