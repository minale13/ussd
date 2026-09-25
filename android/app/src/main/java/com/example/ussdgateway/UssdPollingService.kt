package com.example.ussdgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.IBinder
import android.provider.Settings
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory

class UssdPollingService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val api by lazy { Retrofit.Builder().baseUrl(BuildConfig.API_BASE_URL).addConverterFactory(MoshiConverterFactory.create()).build().create(GatewayApi::class.java) }

    /** Stable device id sent as `x-device-id` so the gateway can match withdrawals targeted at this phone. */
    private val deviceId by lazy { Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) }

    override fun onCreate() {
        super.onCreate()
        running = true
        val simSlot = getSharedPreferences("ussd", MODE_PRIVATE).getInt("sim_slot", 0)
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("ussd", "USSD Gateway", NotificationManager.IMPORTANCE_LOW))
        startForeground(
            1,
            NotificationCompat.Builder(this, "ussd")
                .setContentTitle("USSD Gateway running")
                .setContentText("Polling for withdrawals · SIM ${simSlot + 1}")
                .setSmallIcon(android.R.drawable.stat_sys_phone_call)
                .setOngoing(true)
                .build()
        )
        scope.launch {
            var consecutiveFailures = 0
            while (isActive) {
                runCatching {
                    // Pass our deviceId on every poll: unassigned ("ANY") payouts plus payouts targeted at this exact device.
                    api.pending(BuildConfig.GATEWAY_USER_ID, deviceId, "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}").withdrawals.forEach(::startUssd)
                }.onSuccess { consecutiveFailures = 0 }.onFailure { error ->
                    // Log only the first failure of a streak so a backend outage does not
                    // flood the dashboard activity feed with identical rows.
                    consecutiveFailures++
                    if (consecutiveFailures == 1) ActivityLog.add(this@UssdPollingService, "error", "Gateway poll failed: ${error.message ?: "network error"}")
                }
                delay(5_000)
            }
        }
    }

    private fun startUssd(withdrawal: PendingWithdrawal) {
        val prefs = getSharedPreferences("ussd", MODE_PRIVATE)
        val providerId = withdrawal.provider_transaction_id ?: "USSD-${withdrawal.transaction_id}"
        prefs.edit().putString("provider_transaction_id", providerId).putString("destination", withdrawal.destination).putString("amount", withdrawal.amount).apply()
        val channel = withdrawal.channel ?: prefs.getString("channel", "TELEBIRR") ?: "TELEBIRR"
        // The USSD session authenticates with the account saved during onboarding,
        // so a payout must not be dialled before that login exists.
        if (!Credentials.isConfigured(this)) {
            ActivityLog.add(this, "error", "Payout skipped · open the app and sign in to your channel first")
            return
        }
        val simSlot = prefs.getInt("sim_slot", 0)
        val prefix = if (channel == "CBE") "*889#" else BuildConfig.USSD_PREFIX
        val code = "$prefix*${withdrawal.destination}*${withdrawal.amount}#"
        if (checkSelfPermission(android.Manifest.permission.CALL_PHONE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            ActivityLog.add(this, "error", "Payout skipped · phone permission missing")
            return
        }
        runCatching { startActivity(ussdIntent(code, simSlot)) }
            .onSuccess { ActivityLog.add(this, "success", "USSD launched · $providerId · SIM ${simSlot + 1}") }
            .onFailure { ActivityLog.add(this, "error", "Could not start USSD call: ${it.message ?: "unknown error"}") }
    }

    /**
     * Dials [code] on the chosen SIM. The call is pinned to a specific phone account
     * with [TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE] (id = subscription id, service
     * = the AOSP telephony connection service). Single-SIM devices and OEMs without
     * that account fall back to the default SIM: the extra is ignored when the handle
     * cannot be resolved, and [Sims.subscriptionId] returns -1 when permission is gone.
     */
    private fun ussdIntent(code: String, simSlot: Int): Intent {
        val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:${Uri.encode(code)}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        val subId = Sims.subscriptionId(this, simSlot)
        if (subId < 0) return intent
        val handle = PhoneAccountHandle(
            ComponentName("com.android.phone", "com.android.services.telephony.TelephonyConnectionService"),
            subId.toString(),
        )
        return runCatching {
            val telecom = getSystemService(TelecomManager::class.java)
            if (telecom?.getPhoneAccount(handle) != null) intent.putExtra(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, handle) else intent
        }.getOrDefault(intent)
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() { running = false; scope.cancel(); super.onDestroy() }

    companion object {
        /** Read by the dashboard so the header badge reflects the live service state. */
        @Volatile
        var running = false
    }
}