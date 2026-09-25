package com.example.ussdgateway

import android.content.Context

/**
 * The channel login captured by the onboarding form in assets/dashboard.html.
 *
 * Everything lives in the app-private SharedPreferences("ussd") file next to the
 * other gateway state, so the WebView, the polling service and the accessibility
 * service all read the same record without a network round trip.
 *
 * Only [phone] and the presence of a login are ever handed back to the page; the
 * PIN stays inside the app. It is written under a separate key so a caller that
 * only needs to display the account cannot read it by accident.
 */
object Credentials {
    private const val PREFS = "ussd"
    private const val KEY_PHONE = "login_phone"
    private const val KEY_PIN = "login_pin"
    private const val KEY_SAVED_AT = "login_saved_at"
    private const val KEY_CHANNEL = "channel"

    /** Shortest PIN the onboarding form accepts; keeps a USSD PIN prompt answerable. */
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
     * Stores a validated login. Returns the normalised phone, or null when the
     * input was rejected (the caller reports the reason to the dashboard).
     */
    fun save(context: Context, channel: String, phone: String, pin: String): String? {
        val normalized = normalizePhone(phone)
        if (normalized.isEmpty()) return null
        val trimmedPin = pin.trim()
        if (trimmedPin.length < MIN_PIN_LENGTH) return null
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(KEY_CHANNEL, if (channel == "CBE") "CBE" else "TELEBIRR")
            .putString(KEY_PHONE, normalized)
            .putString(KEY_PIN, trimmedPin)
            .putLong(KEY_SAVED_AT, System.currentTimeMillis())
            .apply()
        return normalized
    }

    /** True once onboarding has saved a usable login. */
    fun isConfigured(context: Context): Boolean = phone(context).isNotEmpty() && pin(context).isNotEmpty()

    fun channel(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_CHANNEL, "TELEBIRR") ?: "TELEBIRR"

    /** Normalised local phone number, or "" when nothing is stored. */
    fun phone(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PHONE, "") ?: ""

    /**
     * The stored wallet PIN. Read only where the USSD menu actually needs it
     * (UssdAccessibilityService answering a PIN prompt); it is never logged.
     */
    fun pin(context: Context): String =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_PIN, "") ?: ""

    fun savedAt(context: Context): Long =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getLong(KEY_SAVED_AT, 0L)

    /** Removes the login; the next dashboard load re-runs onboarding. */
    fun clear(context: Context) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove(KEY_PHONE)
            .remove(KEY_PIN)
            .remove(KEY_SAVED_AT)
            .apply()
    }
}
