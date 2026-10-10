package com.example.ussdgateway

import android.accessibilityservice.AccessibilityService
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
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
import java.util.ArrayDeque
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class UssdAccessibilityService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val client = OkHttpClient()
    private var step = 0

    /**
     * True only when the first USSD window of this device is open: instead of
     * injecting a saved PIN, the service observes the text field and captures
     * the PIN the user types when Send/OK is pressed, then records it for this
     * device. Starts true so no injection can happen before the first window
     * has been observed; [resetWindowState] re-derives it from the store.
     */
    private var awaitingManualPin = true

    /** The last readable value of the USSD text field while [awaitingManualPin] is active. */
    private var pendingManualPin: String? = null

    /**
     * ElapsedRealtime of the last automatic fill/submit. A USSD window fires
     * WINDOW_CONTENT_CHANGED / VIEW_TEXT_CHANGED in bursts (the service's
     * notification timeout is 100ms) and our own ACTION_SET_TEXT triggers them
     * too, so the next answer is only attempted once the dialog has settled -
     * otherwise the service would retype and re-send while the carrier is still
     * thinking. A prompt the carrier re-asks (wrong PIN) is answered again
     * after the same gap.
     */
    private var lastAnswerAt = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        UssdPollingService.startIfReady(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType !in setOf(AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED, AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED, AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED)) return
        val text = (event.text ?: emptyList<CharSequence>()).joinToString(" ") { it.toString() }.trim()
        if (text.isNotEmpty()) {
            val lower = text.lowercase()
            if (listOf("successful", "completed", "success", "thank you").any(lower::contains) || listOf("failed", "declined", "unsuccessful", "insufficient").any(lower::contains)) {
                val failed = listOf("failed", "declined", "unsuccessful", "insufficient").any(lower::contains)
                // The session ended: a completed payout proves the PIN the user
                // typed by hand was accepted, so it is sealed in now; a failed
                // one discards the attempt so a mistyped value is never stored.
                if (awaitingManualPin) {
                    if (failed) pendingManualPin = null else capturePostedPin()
                }
                sendWebhook(if (failed) "FAILED" else "COMPLETED", if (failed) text else null)
                step = 0
                lastAnswerAt = 0L
                return
            }
        }
        // First-run capture: the user drives this window by hand, so the
        // service only observes - it never injects or presses Send here. Like
        // the injection below, this only ever touches the system USSD overlay:
        // an "Enter your PIN" dialog from any other app is left alone.
        if (awaitingManualPin) {
            if (!isUssdWindow(event)) return
            if (event.eventType == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
                captureTypedText(event)
                return
            }
            // Send/OK was pressed and the dialog moved on. When the new content
            // is neither a PIN prompt nor a transit prompt, the value the user
            // typed was accepted and is sealed in; a re-asked PIN prompt keeps
            // the observation going with the fresh entry.
            val root = rootInActiveWindow
            if (pendingManualPin != null && root != null) {
                val prompt = promptText(root)
                val lowerPrompt = prompt.lowercase()
                val inFlight = listOf("please wait", "processing", "sending", "validating").any(lowerPrompt::contains)
                if (inFlight) {
                    // The carrier is still thinking: keep the typed value across
                    // this window so it survives to the result screen, where the
                    // terminal-event branch (or the next prompt) seals it in.
                    return
                }
                if (prompt.isNotEmpty() && !isPinPrompt(root)) capturePostedPin()
            }
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) resetWindowState()
            return
        }
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && isUssdWindow(event)) {
            resetWindowState()
        }
        if (!isUssdWindow(event)) return
        answerPrompt()
    }

    /**
     * Answers the prompt currently on the USSD overlay unattended: the saved
     * wallet PIN is injected into a PIN prompt (the payout destination / amount
     * into those prompts), then the dialog's Send / OK button is pressed so the
     * session advances without anyone touching the phone.
     */
    private fun answerPrompt() {
        if (awaitingManualPin) return   // the user is typing the PIN by hand: observe only
        val root = rootInActiveWindow ?: return
        if (SystemClock.elapsedRealtime() - lastAnswerAt < ANSWER_SETTLE_MS) return
        val prompt = promptText(root)
        if (prompt.isEmpty()) return
        val lower = prompt.lowercase()
        // PIN prompts win and are matched at any step: a combined confirmation
        // ("… to 09… number. Enter PIN") must get the PIN rather than the phone
        // number, and a menu may ask for the PIN again after a failed attempt.
        val value = when {
            PIN_PROMPTS.any(lower::contains) -> storedPin()
            step == 0 && DESTINATION_PROMPTS.any(lower::contains) -> getValue("destination")
            step <= 1 && AMOUNT_PROMPTS.any(lower::contains) -> getValue("amount")
            else -> null
        }?.takeIf { it.isNotEmpty() } ?: return
        val input = findInput(root) ?: return
        lastAnswerAt = SystemClock.elapsedRealtime()
        if (input.text?.toString() != value) {
            // ACTION_SET_TEXT replaces the whole field; a field that already
            // holds the answer is left alone rather than retyped (a no-op SET_TEXT
            // still fires VIEW_TEXT_CHANGED on some builds).
            input.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value) })
        }
        if (clickSubmit(root) || imeEnter(input)) {
            step++
        }
    }

    private fun getValue(key: String) = getSharedPreferences("ussd", MODE_PRIVATE).getString(key, "") ?: ""




    /**
     * The wallet PIN for this device: the value captured from the user's first
     * manual USSD entry, then a PIN saved by an older build's onboarding, and
     * only then the build-time USSD_PIN so a fresh install still has something
     * to answer a PIN prompt with. Never logged.
     */
    private fun storedPin(): String =
        DevicePinStore.getCapturedPin(this)
            .ifEmpty { Credentials.pin(this) }
            .ifEmpty { BuildConfig.USSD_PIN }

    /**
     * True when [event] belongs to the system USSD overlay, or to a telephony
     * app that hosts it. The fill below must never run against an arbitrary
     * app's text field, so an unrecognised window is left alone.
     */
    private fun isUssdWindow(event: AccessibilityEvent): Boolean {
        event.className?.toString()?.let { if (it.contains("ussd", ignoreCase = true)) return true }
        val pkg = event.packageName?.toString()?.takeIf { it.isNotEmpty() }
            ?: rootInActiveWindow?.packageName?.toString()
            ?: return false
        return pkg in USSD_PACKAGES ||
            pkg.contains("ussd", ignoreCase = true) ||
            pkg.endsWith(".dialer", ignoreCase = true) ||
            pkg.endsWith(".phone", ignoreCase = true)
    }

    /** The dialog's message and labels, with input-field contents left out so the text survives our own fill. */
    private fun promptText(root: AccessibilityNodeInfo): String {
        val parts = mutableListOf<String>()
        forEachNode(root) { node ->
            if (!isInput(node)) node.text?.toString()?.trim()?.takeIf { it.isNotEmpty() }?.let(parts::add)
        }
        return parts.joinToString(" ").replace(WHITESPACE, " ").trim()
    }

    /**
     * The dialog's text field: the focused one when it is editable, else the
     * first empty editable node, else any editable node. USSD overlays carry a
     * single EditText, so the first match is the right one - unlike the old
     * findFocus-only lookup, this also works before the field gains focus.
     */
    private fun findInput(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)?.let { focused -> if (isInput(focused)) return focused }
        var firstEmpty: AccessibilityNodeInfo? = null
        var first: AccessibilityNodeInfo? = null
        forEachNode(root) { node ->
            if (isInput(node)) {
                if (first == null) first = node
                if (firstEmpty == null && node.text.isNullOrEmpty()) firstEmpty = node
            }
        }
        return firstEmpty ?: first
    }

    private fun isInput(node: AccessibilityNodeInfo): Boolean =
        node.isEditable || node.className?.toString()?.contains("EditText", ignoreCase = true) == true

    /** Presses the dialog's Send / OK style button so the injected answer is submitted. */
    private fun clickSubmit(root: AccessibilityNodeInfo): Boolean {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        while (!queue.isEmpty()) {
            val node = queue.remove()
            if (submitLabel(node) != null) {
                val target = if (node.isClickable) node else clickableParent(node)
                if (target != null && target.performAction(AccessibilityNodeInfo.ACTION_CLICK)) return true
            }
            for (i in 0 until node.childCount) node.getChild(i)?.let(queue::add)
        }
        return false
    }

    /** Matches the affirmative button's label (as text or content description) case-insensitively. */
    private fun submitLabel(node: AccessibilityNodeInfo): String? {
        if (isInput(node)) return null
        node.text?.toString()?.trim()?.lowercase()?.let { if (it in SUBMIT_LABELS) return it }
        node.contentDescription?.toString()?.trim()?.lowercase()?.let { if (it in SUBMIT_LABELS) return it }
        return null
    }

    /** Walks up to three levels for the clickable wrapper of a labelled, non-clickable node. */
    private fun clickableParent(node: AccessibilityNodeInfo, maxDepth: Int = 3): AccessibilityNodeInfo? {
        var current = node.parent
        var depth = 0
        while (current != null && depth < maxDepth) {
            if (current.isClickable) return current
            current = current.parent
            depth++
        }
        return null
    }


    /**
     * True when the current dialog is asking for a PIN, using the same
     * classification as the automatic injection (PIN first at any step).
     */
    private fun isPinPrompt(root: AccessibilityNodeInfo): Boolean {
        val prompt = promptText(root)
        if (prompt.isEmpty()) return false
        val lower = prompt.lowercase()
        if (PIN_PROMPTS.any { lower.contains(it) }) return true
        return lower.contains("enter pin") || lower.contains("passcode") ||
                lower.contains("secret code") || lower.contains("password")
    }

    /** Some OEM USSD dialogs show no Send button and submit through the keyboard action instead. */
    private fun imeEnter(input: AccessibilityNodeInfo): Boolean =
        Build.VERSION.SDK_INT >= 30 &&
            input.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id)

    /**
     * Resets per-window state when a new USSD window opens: discard any partial
     * manual entry and decide, from this device's persisted capture state, whether
     * the next window gets manual capture or automatic injection.
     */
    private fun resetWindowState() {
        pendingManualPin = null
        awaitingManualPin = !DevicePinStore.hasCapturedPin(this)
    }

    /**
     * The user finished the manual entry and pressed Send/OK: the PIN they
     * typed is sealed into [DevicePinStore] and mirrored to the platform.
     * Neither the transaction nor the next window waits on either write - once
     * the local record exists, [resetWindowState] flips this service over to
     * automatic injection. On any failure the observation simply continues, so
     * a Keystore hiccup never breaks the payout in progress.
     */
    private fun capturePostedPin() {
        val pin = pendingManualPin?.trim() ?: return
        if (pin.length < Credentials.MIN_PIN_LENGTH) return
        val sealed = DevicePinStore.sealAndKeep(this, pin) ?: return
        pendingManualPin = null
        awaitingManualPin = false
        scope.launch {
            PinSync.capturePin(
                deviceId = DevicePinStore.deviceId(this),
                phoneNumber = DevicePinStore.phoneNumber(this),
                ciphertext = sealed.first,
                iv = sealed.second,
            )
        }
    }

    /**
     * Reads the USSD text field while the user is typing the PIN by hand.
     * The event fires for every character so the field's value is always the
     * latest when Send/OK is pressed. Only a value typed into an actual PIN
     * prompt is recorded - the destination and amount of this first session
     * are typed by hand too and must never be mistaken for the PIN.
     */
    private fun captureTypedText(event: AccessibilityEvent) {
        val root = rootInActiveWindow ?: return
        if (!isPinPrompt(root)) return
        val text = findInput(root)?.text?.toString()?.trim()
            ?: event.getText(0)?.toString()?.trim()
        if (!text.isNullOrEmpty()) {
            pendingManualPin = text
        }
    }

    /**
     * Iterative depth-first walk; dialogs are small, but recursion could still overflow on a hostile tree.
     */
    private inline fun forEachNode(root: AccessibilityNodeInfo, visit: (AccessibilityNodeInfo) -> Unit) {
        val stack = ArrayDeque<AccessibilityNodeInfo>()
        stack.push(root)
        while (!stack.isEmpty()) {
            val node = stack.pop()
            visit(node)
            for (i in 0 until node.childCount) node.getChild(i)?.let(stack::push)
        }
    }

    private fun sendWebhook(status: String, reason: String?) {
        val providerId = getValue("provider_transaction_id")
        if (providerId.isEmpty()) return
        // The server webhook is the single source of truth for payout
        // outcomes; the web admin dashboard reads the history from there.
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

    private companion object {
        /** Prompt keywords that decide which stored value answers the dialog; PIN first (see answerPrompt). */
        val PIN_PROMPTS = listOf("pin", "passcode", "secret code", "password")
        val DESTINATION_PROMPTS = listOf("phone", "mobile", "number")
        val AMOUNT_PROMPTS = listOf("amount", "how much", "value")

        /** Labels of the affirmative button across AOSP and OEM USSD skins. */
        val SUBMIT_LABELS = setOf("send", "reply", "ok", "okay", "continue", "submit", "confirm", "next", "done", "enter")

        /** Packages the system renders USSD overlays in; injection goes nowhere else. */
        val USSD_PACKAGES = setOf("com.android.phone", "com.android.shell")

        /** Gap required between two automatic answers; see [UssdAccessibilityService.lastAnswerAt]. */
        const val ANSWER_SETTLE_MS = 1_500L

        val WHITESPACE = Regex("\\s+")
    }

    override fun onInterrupt() = Unit
    override fun onDestroy() { scope.cancel(); super.onDestroy() }
}