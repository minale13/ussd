package com.example.ussdgateway

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Puts the gateway back to work after a device reboot.
 *
 * The app is designed to stay armed: once onboarding saves a login (or Start is
 * tapped) `gateway_active` records the intent to run, so the only thing a reboot
 * actually breaks is the service itself. Android temporarily allow-lists a
 * BOOT_COMPLETED receiver to start a foreground service, which makes this the
 * right hook to hand off to [UssdPollingService.start]. Nothing is started when
 * the user stopped the gateway or never signed in.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return
        if (!Credentials.isConfigured(context)) return
        if (!UssdPollingService.shouldResume(context)) return
        UssdPollingService.start(context)
        ActivityLog.add(context, "info", "Gateway resumed after device restart")
    }
}
