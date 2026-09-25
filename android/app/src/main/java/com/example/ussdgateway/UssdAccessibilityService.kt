package com.example.ussdgateway

import android.accessibilityservice.AccessibilityService
import android.os.Bundle
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class UssdAccessibilityService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = OkHttpClient()
    private var step = 0

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType !in setOf(AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED, AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED, AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED)) return
        val text = (event.text ?: emptyList<CharSequence>()).joinToString(" ") { it.toString() }.trim()
        if (text.isEmpty()) return
        val lower = text.lowercase()
        if (listOf("successful", "completed", "success", "thank you").any(lower::contains) || listOf("failed", "declined", "unsuccessful", "insufficient").any(lower::contains)) {
            val failed = listOf("failed", "declined", "unsuccessful", "insufficient").any(lower::contains)
            sendWebhook(if (failed) "FAILED" else "COMPLETED", if (failed) text else null)
            step = 0
            return
        }
        val value = when {
            step == 0 && listOf("phone", "mobile", "number").any(lower::contains) -> getValue("destination")
            step <= 1 && listOf("amount", "how much", "value").any(lower::contains) -> getValue("amount")
            step <= 2 && listOf("pin", "secret code", "password").any(lower::contains) -> BuildConfig.USSD_PIN
            else -> null
        } ?: return
        rootInActiveWindow?.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.let { node ->
            node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value) })
        }
        val submitLabels = setOf("send", "reply", "ok", "continue", "submit", "confirm")
        rootInActiveWindow?.findAccessibilityNodeInfosByText("")?.firstOrNull { node ->
            node.isClickable && submitLabels.any { label -> node.text?.toString()?.trim()?.equals(label, ignoreCase = true) == true }
        }?.performAction(AccessibilityNodeInfo.ACTION_CLICK)
        step++
    }

    private fun getValue(key: String) = getSharedPreferences("ussd", MODE_PRIVATE).getString(key, "") ?: ""

    private fun sendWebhook(status: String, reason: String?) {
        val providerId = getValue("provider_transaction_id")
        if (providerId.isEmpty()) return
        val body = buildString {
            append("{\"eventId\":\"").append(UUID.randomUUID()).append("\",\"eventType\":\"USSD_PAYMENT_RESULT\",\"providerTransactionId\":\"").append(json(providerId)).append("\",\"status\":\"").append(status).append("\"")
            if (reason != null) append(",\"failureReason\":\"").append(json(reason.take(512))).append("\"")
            append('}')
        }
        scope.launch {
            val request = Request.Builder().url(BuildConfig.API_BASE_URL + "api/webhooks/payment").addHeader("x-provider-signature", "sha256=${hmac(body)}").post(body.toRequestBody("application/json".toMediaType())).build()
            val delivered = runCatching { client.newCall(request).execute().use { it.isSuccessful } }.getOrDefault(false)
            val failed = status == "FAILED"
            val kind = if (failed || !delivered) "error" else "success"
            val suffix = if (delivered) "" else " · webhook not delivered"
            ActivityLog.add(this@UssdAccessibilityService, kind, "Payout ${if (failed) "failed" else "completed"} · $providerId$suffix")
        }
    }

    private fun hmac(body: String): String = Mac.getInstance("HmacSHA256").run { init(SecretKeySpec(BuildConfig.WEBHOOK_SECRET.toByteArray(), algorithm)); doFinal(body.toByteArray()).joinToString("") { "%02x".format(it) } }
    private fun json(value: String) = value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
    override fun onInterrupt() = Unit
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}