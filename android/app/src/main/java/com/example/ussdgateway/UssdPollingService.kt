package com.example.ussdgateway

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.net.Uri
import android.os.IBinder
import android.provider.Settings
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
        getSystemService(NotificationManager::class.java).createNotificationChannel(NotificationChannel("ussd", "USSD Gateway", NotificationManager.IMPORTANCE_LOW))
        startForeground(1, NotificationCompat.Builder(this, "ussd").setContentTitle("USSD Gateway").setContentText("Waiting for withdrawals").setSmallIcon(android.R.drawable.stat_sys_phone_call).setOngoing(true).build())
        scope.launch {
            while (isActive) {
                runCatching {
                    // Pass our deviceId on every poll: unassigned ("ANY") payouts plus payouts targeted at this exact device.
                    api.pending(BuildConfig.GATEWAY_USER_ID, deviceId, "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}").withdrawals.forEach(::startUssd)
                }
                delay(5_000)
            }
        }
    }

    private fun startUssd(withdrawal: PendingWithdrawal) {
        val providerId = withdrawal.provider_transaction_id ?: "USSD-${withdrawal.transaction_id}"
        getSharedPreferences("ussd", MODE_PRIVATE).edit().putString("provider_transaction_id", providerId).putString("destination", withdrawal.destination).putString("amount", withdrawal.amount).apply()
        val channel = withdrawal.channel ?: getSharedPreferences("ussd", MODE_PRIVATE).getString("channel", "TELEBIRR") ?: "TELEBIRR"
        val prefix = if (channel == "CBE") "*889#" else BuildConfig.USSD_PREFIX
        val code = "$prefix*${withdrawal.destination}*${withdrawal.amount}#"
        if (checkSelfPermission(android.Manifest.permission.CALL_PHONE) == android.content.pm.PackageManager.PERMISSION_GRANTED) startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:${Uri.encode(code)}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    override fun onBind(intent: Intent?): IBinder? = null
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}