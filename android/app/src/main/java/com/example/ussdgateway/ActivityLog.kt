package com.example.ussdgateway

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Small capped activity log the dashboard timeline renders. Entries live in the same
 * shared preferences file the rest of the app uses so the WebView, the polling
 * service and the accessibility service (all in one process) share one feed.
 */
object ActivityLog {
    private const val MAX_ENTRIES = 60
    private val lock = Any()

    /**
     * Appends one entry. Kinds used by the dashboard: "info", "success", "error".
     */
    fun add(context: Context, kind: String, message: String) {
        val prefs = context.applicationContext.getSharedPreferences("ussd", Context.MODE_PRIVATE)
        synchronized(lock) {
            val array = readArray(prefs.getString("logs", null))
            array.put(JSONObject().put("t", System.currentTimeMillis()).put("kind", kind).put("msg", message))
            while (array.length() > MAX_ENTRIES) array.remove(0)
            prefs.edit().putString("logs", array.toString()).apply()
        }
    }

    /** Returns the stored log array (oldest first) for the dashboard state payload. */
    fun dump(context: Context): JSONArray {
        val prefs = context.applicationContext.getSharedPreferences("ussd", Context.MODE_PRIVATE)
        synchronized(lock) {
            return readArray(prefs.getString("logs", null))
        }
    }

    private fun readArray(raw: String?): JSONArray =
        if (raw.isNullOrEmpty()) JSONArray() else runCatching { JSONArray(raw) }.getOrElse { JSONArray() }
}
