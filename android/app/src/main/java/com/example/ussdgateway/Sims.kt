package com.example.ussdgateway

import android.content.Context
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager

/**
 * Reads the physical SIM slots available on this device so the dashboard can offer a
 * SIM 1 / SIM 2 picker, and resolves the saved slot back to a live subscription id
 * right before a USSD call is placed (subscription ids change across reboots and SIM
 * swaps, so only the slot index is persisted).
 */
object Sims {

    /** One SIM slot. `subId` is -1 when the subscription could not be resolved. */
    data class Slot(val index: Int, val subId: Int, val label: String, val carrier: String?, val ready: Boolean)

    /** Best-effort slot listing: SubscriptionManager first (READ_PHONE_STATE), TelephonyManager fallback. */
    fun list(context: Context): List<Slot> {
        val fromSubscriptions = subscriptionSlots(context)
        if (fromSubscriptions.isNotEmpty()) return fromSubscriptions
        return telephonySlots(context)
    }

    /** Resolves a 0-based slot index to its current subscription id, or -1 when unknown. */
    fun subscriptionId(context: Context, slot: Int): Int {
        val manager = context.getSystemService(SubscriptionManager::class.java) ?: return -1
        return runCatching { manager.getActiveSubscriptionInfoForSimSlotIndex(slot)?.subscriptionId ?: -1 }
            .getOrDefault(-1)
    }

    private fun subscriptionSlots(context: Context): List<Slot> {
        val manager = context.getSystemService(SubscriptionManager::class.java) ?: return emptyList()
        val infos = runCatching { manager.getActiveSubscriptionInfoList() }.getOrNull() ?: return emptyList()
        return infos
            .filter { it.simSlotIndex >= 0 }
            .sortedBy { it.simSlotIndex }
            .map { info ->
                val carrier = (info.displayName ?: info.carrierName)?.toString()?.trim()
                Slot(
                    index = info.simSlotIndex,
                    subId = info.subscriptionId,
                    label = "SIM ${info.simSlotIndex + 1}",
                    carrier = if (carrier.isNullOrEmpty()) null else carrier,
                    ready = true,
                )
            }
    }

    // Fallback used when READ_PHONE_STATE was denied: slot states stay readable but
    // carrier names and subscription ids do not, so the picker still lists SIM 1 / SIM 2.
    private fun telephonySlots(context: Context): List<Slot> {
        val telephony = context.getSystemService(TelephonyManager::class.java) ?: return emptyList()
        val count = runCatching { telephony.phoneCount }.getOrDefault(1).coerceIn(1, 4)
        return (0 until count).map { index ->
            val state = runCatching { telephony.getSimState(index) }.getOrDefault(TelephonyManager.SIM_STATE_UNKNOWN)
            Slot(index, -1, "SIM ${index + 1}", null, state == TelephonyManager.SIM_STATE_READY)
        }
    }
}
