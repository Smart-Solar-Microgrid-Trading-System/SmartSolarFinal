package com.smartsolarmicrogrid.app

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import java.time.Instant
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object TransactionQrCache {

    data class Entry(
        val ownerId: String,
        val qrPayload: String,
        val expiresAt: String
    )

    fun accountId(token: String): String? {
        return try {
            val tokenParts = token.split(".")
            require(tokenParts.size == 3)

            val claims = JSONObject(
                String(
                    Base64.decode(
                        tokenParts[1],
                        Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING
                    ),
                    Charsets.UTF_8
                )
            )

            listOf(
                "nameid",
                "sub",
                "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
            ).firstNotNullOfOrNull { claim ->
                claims.optString(claim).takeIf { it.isNotBlank() }
            }
        } catch (_: Exception) {
            null
        }
    }

    fun get(
        context: Context,
        reservationId: String,
        ownerId: String
    ): Entry? {
        val preferences = preferences(context)
        val preferenceKey = preferenceKey(reservationId)
        val encryptedValue = preferences.getString(preferenceKey, null)
            ?: return null

        return try {
            val parts = encryptedValue.split(":", limit = 2)
            require(parts.size == 2)

            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(
                Cipher.DECRYPT_MODE,
                secretKey(),
                GCMParameterSpec(
                    GCM_TAG_LENGTH_BITS,
                    Base64.decode(parts[0], Base64.NO_WRAP)
                )
            )

            val payload = String(
                cipher.doFinal(
                    Base64.decode(parts[1], Base64.NO_WRAP)
                ),
                Charsets.UTF_8
            )

            val json = JSONObject(payload)
            val entry = Entry(
                ownerId = json.getString("ownerId"),
                qrPayload = json.getString("qrPayload"),
                expiresAt = json.getString("expiresAt")
            )

            if (entry.ownerId != ownerId) {
                null
            } else if (Instant.now().isBefore(Instant.parse(entry.expiresAt))) {
                entry
            } else {
                preferences.edit().remove(preferenceKey).apply()
                null
            }
        } catch (_: Exception) {
            preferences.edit().remove(preferenceKey).apply()
            null
        }
    }

    fun save(
        context: Context,
        reservationId: String,
        ownerId: String,
        qrPayload: String,
        expiresAt: String
    ) {
        try {
            val json = JSONObject().apply {
                put("ownerId", ownerId)
                put("qrPayload", qrPayload)
                put("expiresAt", expiresAt)
            }

            val cipher = Cipher.getInstance(TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey())

            val encryptedValue =
                Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" +
                    Base64.encodeToString(
                        cipher.doFinal(json.toString().toByteArray(Charsets.UTF_8)),
                        Base64.NO_WRAP
                    )

            preferences(context)
                .edit()
                .putString(preferenceKey(reservationId), encryptedValue)
                .apply()
        } catch (_: Exception) {
            // QR display can continue even if secure caching is unavailable.
        }
    }

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEY_STORE_NAME).apply {
            load(null)
        }

        (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let {
            return it
        }

        return KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEY_STORE_NAME
        ).apply {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or
                        KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .build()
            )
        }.generateKey()
    }

    private fun preferences(context: Context) =
        context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)

    private fun preferenceKey(reservationId: String) =
        "reservation_$reservationId"

    private const val PREFERENCES_NAME = "secure_transaction_qr_cache"
    private const val KEY_STORE_NAME = "AndroidKeyStore"
    private const val KEY_ALIAS = "smart_solar_transaction_qr_cache"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128
}
