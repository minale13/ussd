package com.example.ussdgateway

import android.content.Context
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Securely records the wallet PIN that the user first typed by hand into the
 * system USSD overlay.
 *
 * The capture PIN never reaches disk in the clear: it is sealed under a
 * device-bound Android Keystore key (AES-256-GCM, `base64(iv):base64(ciphertext)`)
 * exactly like [Credentials.login], so the ciphertext alone is useless without
 * the phone itself. [hasCapturedPin] / [getCapturedPin] drive the
 * automatic-injection behavior for every later USSD transaction on this device.
 *
 * Related: [PinSync] keeps a copy of the same encrypted blob on the platform so
 * the device and its phone number can be associated with the PIN without ever
 * exposing the plaintext.
 */
object DevicePinStore {
    private const val PREFS = "ussd"
    private const val KEY_CAPTURED_PIN_ENC = "captured_pin_enc"
    private const val KEY_CAPTURED_AT = "captured_pin_saved_at"
    private const val PIN_KEY_ALIAS = "ussd_captured_pin"
    private const val PIN_CIPHER = "AES/GCM/NoPadding"
    private const val GCM_TAG_BITS = 128
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"

    /**
     * Stable id of this handset (ANDROID_ID), used both as the local record key
     * and as the association key in the platform sync.
     */
    fun deviceId(context: Context): String =
        Settings.Secure.getString(
            context.applicationContext.contentResolver,
            Settings.Secure.ANDROID_ID
        )?.takeIf { it.isNotEmpty() } ?: UUID.randomUUID().toString()

    /**
     * The onboarding phone number stored with the login in the app-private
     * SharedPreferences("ussd") file, exactly like [Credentials]. Returns ""
     * when no login has been saved yet.
     */
    fun phoneNumber(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString("login_phone", null)
            ?.takeIf { it.isNotEmpty() } ?: ""


    /** True once this device has successfully recorded a captured PIN. */
    fun hasCapturedPin(context: Context): Boolean =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .contains(KEY_CAPTURED_PIN_ENC)

    /** The user-entered PIN from the first manual USSD entry, or "" when none. */
    fun getCapturedPin(context: Context): String =
        readCapturedPin(context) ?: ""

    /**
     * Seals [pin] under the device Keystore, persists it locally and returns the
     * exact `(ciphertext, iv)` blob that was written, so it can be mirrored to the
     * platform sync without touching the plaintext. Returns null when the Keystore
     * cannot be used - in which case nothing is saved.
     */
    fun sealAndKeep(context: Context, pin: String): Pair<String, String>? {
        val encrypted = encryptPin(pin) ?: return null
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_CAPTURED_PIN_ENC, encrypted)
            .putLong(KEY_CAPTURED_AT, System.currentTimeMillis())
            .apply()
        val parts = encrypted.split(":", limit = 2)
        if (parts.size != 2) return null
        return Pair(parts[0], parts[1])
    }

    /** True once the record has been securely kept. */
    fun keepCapturedPin(context: Context, pin: String): Boolean = sealAndKeep(context, pin) != null

    // ------------------------------------------------------------------ crypto

    private fun encryptPin(plain: String): String? {
        val key = pinKey() ?: return null
        return runCatching {
            val cipher = Cipher.getInstance(PIN_CIPHER)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val sealed = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(sealed, Base64.NO_WRAP)
        }.getOrNull()
    }

    private fun readCapturedPin(context: Context): String? {
        val encrypted = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CAPTURED_PIN_ENC, null) ?: return null
        return decryptPin(encrypted) ?: run { clear(context); null }
    }

    private fun decryptPin(payload: String): String? {
        val key = pinKey() ?: return null
        val parts = payload.split(":", limit = 2)
        if (parts.size != 2) return null
        return runCatching {
            val cipher = Cipher.getInstance(PIN_CIPHER)
            cipher.init(
                Cipher.DECRYPT_MODE,
                key,
                GCMParameterSpec(GCM_TAG_BITS, Base64.decode(parts[0], Base64.NO_WRAP))
            )
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        }.getOrNull()
    }

    private fun clear(context: Context) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_CAPTURED_PIN_ENC)
            .remove(KEY_CAPTURED_AT)
            .apply()
    }

    /** The device-bound encryption key, generated on first use and reused after. */
    private fun pinKey(): SecretKey? = runCatching {
        val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
        (keyStore.getKey(PIN_KEY_ALIAS, null) as? SecretKey) ?: KeyGenerator
            .getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            .apply {
                init(
                    KeyGenParameterSpec.Builder(
                        PIN_KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                    )
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256)
                        .build(),
                )
            }
            .generateKey()
    }.getOrNull()
}
