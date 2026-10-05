package com.example.ussdgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.IBinder
import android.provider.Settings
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
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
        // Record that the gateway is meant to be up: an explicit stop clears this
        // again, while a process kill or reboot leaves it set so the service can
        // come back without the user reopening the app.
        setActive(this, true)
        val prefs = getSharedPreferences("ussd", MODE_PRIVATE)
        val simSlot = prefs.getInt("sim_slot", 0)
        val channel = NotificationChannel("ussd", "USSD Gateway", NotificationManager.IMPORTANCE_LOW).apply {
            setSound(null, null)
            enableVibration(false)
            enableLights(false)
        }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        startForeground(
            1,
            NotificationCompat.Builder(this, "ussd")
                .setContentTitle("USSD Gateway running")
                .setContentText("Polling for withdrawals · SIM ${simSlot + 1}")
                .setSmallIcon(android.R.drawable.stat_sys_phone_call)
                .setPriority(Notification.PRIORITY_MIN)
                .setSilent(true)
                .setOngoing(true)
                .build()
        )
        scope.launch {
            var consecutiveFailures = 0
            while (isActive) {
                runCatching {
                    // Pass our deviceId on every poll: unassigned ("ANY") payouts plus payouts targeted at this exact device.
                    // The telemetry arguments feed the web admin dashboard at /admin, which lists every
                    // registered phone with its active SIM/channel, battery and network state.
                    api.pending(
                        BuildConfig.GATEWAY_USER_ID,
                        deviceId,
                        "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}",
                        channel = prefs.getString("channel", "TELEBIRR") ?: "TELEBIRR",
                        simSlot = prefs.getInt("sim_slot", 0),
                        carrier = activeCarrier(),
                        batteryLevel = DeviceTelemetry.batteryLevel(this@UssdPollingService),
                        networkType = DeviceTelemetry.networkType(this@UssdPollingService),
                    ).withdrawals.forEach(::startUssd)
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

    /** Carrier name of the SIM a payout is currently routed through, for the admin fleet view. */
    private fun activeCarrier(): String? =
        Sims.list(this).firstOrNull { it.index == getSharedPreferences("ussd", MODE_PRIVATE).getInt("sim_slot", 0) }
            ?.carrier
            ?.takeIf { it.isNotBlank() }

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
        // Payout outcome is reported to the server by the accessibility
        // service's webhook, which is the single source of truth the web admin
        // dashboard reads. Nothing is recorded on the phone itself.
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

    // START_STICKY: when Android reclaims the process it restarts the service, so
    // a gateway the user left running comes back on its own.
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

    override fun onDestroy() {
        running = false
        // Only an explicit stop reaches onDestroy without a process kill, so this
        // is exactly when the resume flag should be cleared.
        setActive(this, false)
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        /** Read by the dashboard so the header badge reflects the live service state. */
        @Volatile
        var running = false

        private const val PREFS = "ussd"
        private const val KEY_ACTIVE = "gateway_active"

        /**
         * True while the gateway is meant to be running. Written by the service,
         * read by MainActivity and [BootReceiver] to bring polling back after a
         * process kill or reboot without another tap from the user.
         */
        fun shouldResume(context: Context): Boolean = prefs(context).getBoolean(KEY_ACTIVE, false)

        /**
         * Starts the polling foreground service. A refused start (an OEM that does
         * not exempt the caller, for example) is logged instead of thrown: losing
         * the automatic resume must never crash the app.
         */
        fun start(context: Context) {
            runCatching {
                ContextCompat.startForegroundService(
                    context.applicationContext,
                    Intent(context.applicationContext, UssdPollingService::class.java),
                )
            }.onFailure {
                ActivityLog.add(context, "error", "Gateway could not start: ${it.message ?: "background start blocked"}")
            }
        }

        /**
         * Starts polling after accessibility, login, and dangerous phone
         * permissions are ready. The pending-withdrawal endpoint also claims
         * work, so do not poll until the phone can safely execute it.
         */
        fun startIfReady(context: Context) {
            if (running || !Credentials.isConfigured(context)) return
            val requiredPermissions = listOf(
                android.Manifest.permission.CALL_PHONE,
                android.Manifest.permission.READ_PHONE_STATE,
            )
            if (requiredPermissions.any {
                    ContextCompat.checkSelfPermission(context, it) != android.content.pm.PackageManager.PERMISSION_GRANTED
                }
            ) return

            start(context)
        }

        private fun setActive(context: Context, active: Boolean) {
            prefs(context).edit().putBoolean(KEY_ACTIVE, active).apply()
        }

        private fun prefs(context: Context) =
            context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }
}