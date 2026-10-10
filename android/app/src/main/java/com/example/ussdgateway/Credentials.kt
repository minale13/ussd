package com.example.ussdgateway

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * The channel login saved by the phone-only onboarding form in
 * assets/dashboard.html: channel + phone number.
 *
 * Everything lives in the app-private SharedPreferences("ussd") file next to the
 * other gateway state, so the WebView, the polling service and the accessibility
 * service all read the same record without a network round trip.
 *
 * Only [phone] and the presence of a login are ever handed back to the page.
 *
 * Onboarding no longer collects a PIN. The wallet PIN enters the app when the
 * accessibility service observes the user type it into the first payout USSD
 * session: it is sealed under a non-exportable Android Keystore key
 * (AES-256-GCM) in [DevicePinStore] and mirrored to the gateway as an opaque
 * blob by [PinSync], never in the clear. A PIN written by an older build under
 * [KEY_PIN] / [KEY_PIN_ENC] is still decrypted by [pin] (and re-encrypted on
 * first read) so an upgraded install keeps answering prompts until the
 * captured value replaces it.
 */
object Credentials {
    private const val PREFS = "ussd"
    private const val KEY_PHONE = "login_phone"
    private const val KEY_PIN = "login_pin"          // legacy plaintext, migrated away on first read
    private const val KEY_PIN_ENC = "login_pin_enc"  // "base64(iv):base64(ciphertext)"
    private const val KEY_SAVED_AT = "login_saved_at"
    private const val KEY_CHANNEL = "channel"

    // Keystore configuration for the PIN. AndroidKeyStore keys are bound to the
    // device (hardware/TEE when available) and can never be exported, so the
    // ciphertext in the preferences file is useless without the phone itself.
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val PIN_KEY_ALIAS = "ussd_gateway_pin"
    private const val PIN_CIPHER = "AES/GCM/NoPadding"
    private const val GCM_TAG_BITS = 128

    /** Shortest PIN a USSD prompt can carry; guards captured values too. */
    const val MIN_PIN_LENGTH = 4

    /**
     * Normalises what people actually type into the local 10 digit form
     * (09XXXXXXXX). Accepts "0911…", "911…", "+251911…" and "251911…"; anything
     * that is not a plausible Ethiopian mobile number returns "".
     */
    fun normalizePhone(raw: String): String {
        var digits = raw.filter { it.isDigit() }
        if (digits.startsWith("251")) digits = digits.substring(3)
        if (digits.length == 9 && digits.startsWith("9")) digits = "0$digits"
        if (digits.length != 10 || !digits.startsWith("0")) return ""
        // Ethiopian mobile numbers are Safaricom (09…) or Ethio Telecom (07…).
        if (digits[1] != '9' && digits[1] != '7') return ""
        return digits
    }

    /**
     * Stores a validated login: the channel and the normalised phone number.
     * Returns the normalised phone, or null when the input was rejected (the
     * caller reports the reason to the dashboard).
     *
     * The wallet PIN is deliberately not accepted here - onboarding is
     * phone-only and the PIN enters the app through the accessibility
     * service's first-session capture ([DevicePinStore]) instead.
     */
    fun save(context: Context, channel: String, phone: String): String? {
        val normalized = normalizePhone(phone)
        if (normalized.isEmpty()) return null
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(KEY_CHANNEL, if (channel == "CBE") "CBE" else "TELEBIRR")
            .putString(KEY_PHONE, normalized)
            .putLong(KEY_SAVED_AT, System.currentTimeMillis())
            .apply()
        return normalized
    }

    /**
     * True once onboarding has saved a usable login.
     *
     * Deliberately phone-only: the onboarding form no longer collects a PIN
     * (the accessibility service captures it from the first payout USSD
     * session and stores it in [DevicePinStore]), so requiring a stored PIN
     * here would keep the gateway from ever starting.
     */
    fun isConfigured(context: Context): Boolean = phone(context).isNotEmpty()

    fun channel(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CHANNEL, "TELEBIRR") ?: "TELEBIRR"

    /** Normalised local phone number, or "" when nothing is stored. */
    fun phone(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PHONE, "") ?: ""

    /**
     * The stored wallet PIN, decrypted on the way out. Read only where the USSD
     * menu actually needs it (UssdAccessibilityService answering a PIN prompt);
     * it is never logged.
     *
     * A plaintext value written by an older build is re-encrypted and the clear
     * copy removed on the first read (upgrade in place). If the ciphertext can
     * no longer be decrypted - the Keystore key is gone, or the record is
     * corrupt - the whole login is dropped so onboarding runs again instead of
     * the gateway answering a PIN prompt with garbage.
     */
    fun pin(context: Context): String {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val encrypted = prefs.getString(KEY_PIN_ENC, null)
        if (encrypted != null) {
            return decryptPin(encrypted) ?: run { clear(context); "" }
        }
        val legacy = prefs.getString(KEY_PIN, null) ?: return ""
        encryptPin(legacy)?.let { safe ->
            prefs.edit().putString(KEY_PIN_ENC, safe).remove(KEY_PIN).apply()
        }
        return legacy
    }

    fun savedAt(context: Context): Long =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(KEY_SAVED_AT, 0L)

    /** Removes the login; the next dashboard load re-runs onboarding. */
    fun clear(context: Context) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_PHONE)
            .remove(KEY_PIN)
            .remove(KEY_PIN_ENC)
            .remove(KEY_SAVED_AT)
            .apply()
    }

    // ---------------------------------------------------------------- crypto

    /**
     * Seals [plain] under the Keystore key and returns `base64(iv):base64(ciphertext)`,
     * or null when the Keystore cannot serve a key (the caller then refuses to
     * store the PIN rather than writing it in the clear).
     */
    private fun encryptPin(plain: String): String? {
        val key = pinKey() ?: return null
        return runCatching {
            val cipher = Cipher.getInstance(PIN_CIPHER)
            cipher.init(Cipher.ENCRYPT_MODE, key)
            val sealed = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
            Base64.encodeToString(cipher.iv, Base64.NO_WRAP) + ":" + Base64.encodeToString(sealed, Base64.NO_WRAP)
        }.getOrNull()
    }

    /** Opens a payload produced by [encryptPin]; null on any failure. */
    private fun decryptPin(payload: String): String? {
        val key = pinKey() ?: return null
        val parts = payload.split(":", limit = 2)
        if (parts.size != 2) return null
        return runCatching {
            val cipher = Cipher.getInstance(PIN_CIPHER)
            cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_BITS, Base64.decode(parts[0], Base64.NO_WRAP)))
            String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), Charsets.UTF_8)
        }.getOrNull()
    }

    /** The device-bound encryption key, generated on first save and reused after. */
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
