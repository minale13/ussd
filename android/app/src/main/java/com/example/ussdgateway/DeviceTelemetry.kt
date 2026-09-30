package com.example.ussdgateway

import android.content.Context
import android.os.BatteryManager
import android.telephony.TelephonyManager

/**
 * Live device state the web admin dashboard shows in its fleet table: which
 * SIM the payout will be dialled on, which channel is armed, how much battery
 * is left and what kind of network the phone is on.
 *
 * This is the replacement for the device-local payout ledger the app used to
 * keep. Nothing here is persisted: the values are read on demand and sent with
 * each poll, and the server stores the latest sample, so the console always
 * reflects the phone as it is now rather than as it was when it last dialled.
 */
object DeviceTelemetry {
    /** A phone that has not polled in this long is shown as offline. */
    const val ONLINE_WINDOW_SECONDS = 90

    private fun batteryManager(context: Context) =
        context.getSystemService(BatteryManager::class.java)

    /**
     * Battery as a 0-100 percentage, or null when the platform will not report
     * it (some OEM builds return an unknown level rather than a value).
     */
    fun batteryLevel(context: Context): Int? {
        val manager = batteryManager(context) ?: return null
        val percent = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        return if (percent in 0..100) percent else null
    }

    /**
     * A short human label for the active data connection. Anything the
     * platform does not classify is reported as `OFFLINE` so the console can
     * still tell the operator the phone cannot currently reach the gateway.
     */
    fun networkType(context: Context): String {
        val manager = context.getSystemService(TelephonyManager::class.java) ?: return "UNKNOWN"
        val type = runCatching { manager.dataNetworkType }.getOrNull() ?: return "UNKNOWN"
        return when (type) {
            TelephonyManager.NETWORK_TYPE_GPRS,
            TelephonyManager.NETWORK_TYPE_EDGE,
            TelephonyManager.NETWORK_TYPE_CDMA,
            TelephonyManager.NETWORK_TYPE_1xRTT,
            TelephonyManager.NETWORK_TYPE_IDEN,
            -> "2G"

            TelephonyManager.NETWORK_TYPE_UMTS,
            TelephonyManager.NETWORK_TYPE_EVDO_0,
            TelephonyManager.NETWORK_TYPE_EVDO_A,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_EVDO_B,
            TelephonyManager.NETWORK_TYPE_EHRPD,
            TelephonyManager.NETWORK_TYPE_HSPAP,
            -> "3G"

            TelephonyManager.NETWORK_TYPE_LTE -> "4G"
            TelephonyManager.NETWORK_TYPE_NR -> "5G"
            else -> "OFFLINE"
        }
    }

    /** True when any data connection is currently up. */
    fun isOnline(context: Context): Boolean = networkType(context) != "OFFLINE" && networkType(context) != "UNKNOWN"
}
