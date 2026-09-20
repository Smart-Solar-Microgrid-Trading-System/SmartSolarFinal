package com.smartsolarmicrogrid.app

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class SessionDatabaseHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {
    override fun onCreate(database: SQLiteDatabase) {
        database.execSQL(
            "CREATE TABLE session (id INTEGER PRIMARY KEY, token TEXT NOT NULL, role TEXT NOT NULL, name TEXT NOT NULL)"
        )
        database.execSQL(
            "CREATE TABLE profile_cache (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, phone TEXT, role TEXT NOT NULL, updated_at TEXT)"
        )
    }

    override fun onUpgrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        if (oldVersion < 2) {
            database.execSQL(
                "CREATE TABLE profile_cache (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT, phone TEXT, role TEXT NOT NULL, updated_at TEXT)"
            )
        }
    }

    fun hasSession(): Boolean = readableDatabase.rawQuery("SELECT 1 FROM session WHERE id = 1", null).use { it.moveToFirst() }

    fun saveSession(token: String, role: String, name: String) {
        val values = ContentValues().apply {
            put("id", 1)
            put("token", token)
            put("role", role)
            put("name", name)
        }
        writableDatabase.insertWithOnConflict("session", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getSession(): MobileSession? = readableDatabase.rawQuery(
        "SELECT token, role, name FROM session WHERE id = 1", null
    ).use { cursor ->
        if (!cursor.moveToFirst()) null else MobileSession(
            cursor.getString(0), cursor.getString(1), cursor.getString(2)
        )
    }

    fun clearSession() = writableDatabase.delete("session", "id = 1", null)

    fun saveProfile(profile: CachedProfile) {
        val values = ContentValues().apply {
            put("id", profile.id)
            put("full_name", profile.fullName)
            put("email", profile.email)
            put("phone", profile.phone)
            put("role", profile.role)
            put("updated_at", profile.updatedAt)
        }
        writableDatabase.insertWithOnConflict("profile_cache", null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getProfile(): CachedProfile? = readableDatabase.rawQuery(
        "SELECT id, full_name, email, phone, role, updated_at FROM profile_cache LIMIT 1", null
    ).use { cursor ->
        if (!cursor.moveToFirst()) null else CachedProfile(
            cursor.getString(0), cursor.getString(1), cursor.getString(2).orEmpty(),
            cursor.getString(3).orEmpty(), cursor.getString(4), cursor.getString(5).orEmpty()
        )
    }

    fun clearProfile() = writableDatabase.delete("profile_cache", null, null)

    data class MobileSession(val token: String, val role: String, val name: String)
    data class CachedProfile(
        val id: String,
        val fullName: String,
        val email: String,
        val phone: String,
        val role: String,
        val updatedAt: String
    )

    private companion object {
        const val DATABASE_NAME = "smart_solar_microgrid.db"
        const val DATABASE_VERSION = 2
    }
}
