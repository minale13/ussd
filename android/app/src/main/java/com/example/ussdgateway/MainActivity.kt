package com.example.ussdgateway

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * Dark fintech dashboard host. A three-step permission gate (accessibility, phone
 * calls, SIM access) guards a WebView that renders assets/dashboard.html; the page
 * talks back through [DashboardBridge] to read live state and start/stop the gateway.
 */
class MainActivity : ComponentActivity() {
    private lateinit var content: LinearLayout
    private val preferences by lazy { getSharedPreferences("ussd", MODE_PRIVATE) }
    private var webView: WebView? = null
    private var dashboardShown = false

    // Fires the standard system request so Android shows its own Allow / Deny dialog
    // over this screen instead of sending users to Settings.
    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { showPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = NAVY
        window.navigationBarColor = NAVY
        if (permissionsGranted()) showDashboard() else showPermissions()
    }

    override fun onResume() {
        super.onResume()
        route()
    }

    // Keeps both screens in sync with reality: returning from Settings re-renders the
    // checklist with fresh button states, and a revoked permission drops us back to it.
    private fun route() {
        if (!permissionsGranted()) {
            dashboardShown = false
            showPermissions()
        } else if (dashboardShown) {
            pushState()
        } else {
            showPermissions()
        }
    }

    private fun base(title: String): LinearLayout {
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 72, 48, 48)
            gravity = Gravity.CENTER_HORIZONTAL
            setBackgroundColor(NAVY)
        }
        content.addView(TextView(this).apply { text = title; textSize = 26f; setTextColor(TEXT_PRIMARY); setTypeface(null, Typeface.BOLD) })
        setContentView(content)
        return content
    }

    private fun showPermissions() {
        dashboardShown = false
        val view = base("Required permissions")
        view.addView(TextView(this).apply { text = "USSD automation needs the accessibility service, phone-call access and SIM access."; textSize = 16f; setTextColor(TEXT_MUTED); setPadding(0, 24, 0, 0) })

        view.addView(instruction("1. Turn on accessibility", "Android only allows this from system settings. Tap the button below, then in the Accessibility screen find \"USSD Gateway\" and switch it on."))
        view.addView(permissionButton(if (accessibilityEnabled()) "Accessibility enabled" else "ENABLE ACCESSIBILITY", accessibilityEnabled()) { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) })

        view.addView(instruction("2. Allow phone calls", "Tap the button below and choose Allow in the Android permission dialog that pops up at the bottom of the screen."))
        view.addView(permissionButton(if (callPermissionGranted()) "Phone permission granted" else "ALLOW PHONE CALLS", callPermissionGranted()) { requestPermission(Manifest.permission.CALL_PHONE, "call_requested") })

        view.addView(instruction("3. Read SIM cards", "Lets the dashboard list the SIM slots (SIM 1 / SIM 2) and route each payout through the card you pick. Tap below and choose Allow."))
        view.addView(permissionButton(if (simPermissionGranted()) "SIM access granted" else "ALLOW SIM ACCESS", simPermissionGranted()) { requestPermission(Manifest.permission.READ_PHONE_STATE, "sim_requested") })

        if (!callPermissionGranted() && dialogBlocked(Manifest.permission.CALL_PHONE, "call_requested")) {
            view.addView(blockedHint("Android is currently blocking the phone-call dialog for this app. If tapping the button does nothing, open Settings > Apps > USSD Gateway > Permissions > Phone, allow it, then come back."))
        }
        if (!simPermissionGranted() && dialogBlocked(Manifest.permission.READ_PHONE_STATE, "sim_requested")) {
            view.addView(blockedHint("Android is currently blocking the SIM permission dialog. Open Settings > Apps > USSD Gateway > Permissions > Phone, allow it, then come back."))
        }

        view.addView(Button(this).apply { text = "Continue"; isEnabled = permissionsGranted(); setOnClickListener { showDashboard() } })
    }

    private fun instruction(title: String, body: String) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, 32, 0, 0)
        addView(TextView(this@MainActivity).apply { text = title; textSize = 17f; setTextColor(TEXT_PRIMARY); setTypeface(null, Typeface.BOLD); layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT) })
        addView(TextView(this@MainActivity).apply { text = body; textSize = 14f; setTextColor(TEXT_MUTED); setPadding(0, 8, 0, 0); layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT) })
    }

    private fun blockedHint(text: String) = TextView(this).apply { this.text = text; textSize = 13f; setTextColor(ACCENT_AMBER); setPadding(0, 16, 0, 0) }

    private fun permissionButton(label: String, done: Boolean, onClick: () -> Unit) = Button(this).apply {
        text = label
        isEnabled = !done
        setOnClickListener { onClick() }
    }

    private fun requestPermission(permission: String, requestedKey: String) {
        preferences.edit().putBoolean(requestedKey, true).apply()
        permissionLauncher.launch(permission)
    }

    // The system dialog is the normal path; it stops appearing only after the user
    // picked "Don't ask again", which is worth pointing out when that happens.
    private fun dialogBlocked(permission: String, requestedKey: String): Boolean {
        if (!preferences.getBoolean(requestedKey, false)) return false
        return !shouldShowRequestPermissionRationale(permission)
    }

    // ---------------------------------------------------------------- dashboard

    private fun showDashboard() {
        val wv = webView ?: createWebView()
        val container = FrameLayout(this).apply {
            fitsSystemWindows = true
            setBackgroundColor(NAVY)
            addView(wv, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        }
        setContentView(container)
        dashboardShown = true
        if (wv.url == null) wv.loadUrl("file:///android_asset/dashboard.html") else pushState()
    }

    private fun createWebView(): WebView = WebView(this).apply {
        settings.javaScriptEnabled = true
        settings.allowFileAccess = true
        setBackgroundColor(NAVY)
        webViewClient = WebViewClient()
        addJavascriptInterface(DashboardBridge(), "AndroidGateway")
        webView = this
    }

    // Re-renders the page in place (scroll position survives). WebView methods are
    // thread-checked, so bridge callers are marshalled onto the main thread.
    private fun pushState() {
        val wv = webView ?: return
        runOnUiThread {
            if (wv.url == null) return@runOnUiThread
            wv.evaluateJavascript("typeof refresh === 'function' && refresh()", null)
        }
    }

    /**
     * Exposed to assets/dashboard.html as `AndroidGateway`. Bridge methods run on a
     * WebView worker thread, so anything touching views hops back via [runOnUiThread].
     */
    inner class DashboardBridge {
        /** Full state snapshot as JSON; the page polls this every couple of seconds. */
        @JavascriptInterface
        fun getState(): String {
            val state = JSONObject()
                .put("running", UssdPollingService.running)
                .put("channel", preferences.getString("channel", "TELEBIRR"))
                .put("simSlot", preferences.getInt("sim_slot", 0))
                .put("accessibility", accessibilityEnabled())
                .put("callPermission", callPermissionGranted())
                .put("simPermission", simPermissionGranted())
            val sims = JSONArray()
            Sims.list(this@MainActivity).forEach { slot ->
                sims.put(
                    JSONObject()
                        .put("slot", slot.index)
                        .put("label", slot.label)
                        .put("carrier", slot.carrier ?: "")
                        .put("ready", slot.ready)
                )
            }
            state.put("sims", sims)
            state.put("logs", ActivityLog.dump(this@MainActivity))
            // Only the channel and phone are exposed: the PIN stays in
            // SharedPreferences and is never handed back to the WebView.
            val loginPhone = preferences.getString("login_phone", null)
            state.put(
                "credentials",
                if (loginPhone.isNullOrEmpty()) JSONObject() else JSONObject()
                    .put("channel", preferences.getString("channel", "TELEBIRR"))
                    .put("phone", loginPhone)
                    .put("savedAt", preferences.getLong("login_saved_at", 0L))
            )
            return state.toString()
        }

        @JavascriptInterface
        fun setChannel(channel: String) {
            if (channel != "TELEBIRR" && channel != "CBE") return
            preferences.edit().putString("channel", channel).apply()
            ActivityLog.add(this@MainActivity, "info", "Channel set to ${channelLabel(channel)}")
            pushState()
        }

        /**
         * Persists the onboarding login for [channel] into SharedPreferences("ussd"),
         * the same store the polling and accessibility services read, so the saved
         * phone and PIN are available to the automated USSD session.
         * Credentials.save() re-validates on the native side: the WebView is not
         * a trust boundary, and the PIN never comes back out to the page.
         */
        @JavascriptInterface
        fun setCredentials(channel: String, phone: String, pin: String) {
            if (channel != "TELEBIRR" && channel != "CBE") return
            val normalized = Credentials.save(this@MainActivity, channel, phone, pin)
            if (normalized == null) {
                ActivityLog.add(this@MainActivity, "error", "Login rejected · check the phone number and PIN")
                pushState()
                return
            }
            ActivityLog.add(this@MainActivity, "success", "Logged in to ${channelLabel(channel)} · +251 $normalized")
            pushState()
        }

        /** Wipes the stored login so the next launch runs onboarding again. */
        @JavascriptInterface
        fun clearCredentials() {
            Credentials.clear(this@MainActivity)
            ActivityLog.add(this@MainActivity, "info", "Channel login cleared")
            pushState()
        }

        @JavascriptInterface
        fun setSim(slot: Int) {
            if (slot < 0 || slot > 3) return
            preferences.edit().putInt("sim_slot", slot).apply()
            ActivityLog.add(this@MainActivity, "info", "Payouts routed through SIM ${slot + 1}")
            pushState()
        }

        @JavascriptInterface
        fun startGateway() {
            if (UssdPollingService.running) { pushState(); return }
            val channel = channelLabel(preferences.getString("channel", "TELEBIRR") ?: "TELEBIRR")
            val sim = preferences.getInt("sim_slot", 0) + 1
            ActivityLog.add(this@MainActivity, "success", "Gateway started · $channel · SIM $sim")
            ContextCompat.startForegroundService(applicationContext, Intent(applicationContext, UssdPollingService::class.java))
            pushState()
        }

        @JavascriptInterface
        fun stopGateway() {
            applicationContext.stopService(Intent(applicationContext, UssdPollingService::class.java))
            ActivityLog.add(this@MainActivity, "info", "Gateway stopped")
            pushState()
        }

        @JavascriptInterface
        fun openAccessibilitySettings() {
            runOnUiThread { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        }

        @JavascriptInterface
        fun openAppSettings() {
            runOnUiThread {
                startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
            }
        }
    }

    // -------------------------------------------------------------------- shared

    private fun permissionsGranted() = accessibilityEnabled() && callPermissionGranted() && simPermissionGranted()
    private fun callPermissionGranted() = ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
    private fun simPermissionGranted() = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    private fun channelLabel(channel: String) = if (channel == "CBE") "CBE Birr" else "Telebirr"
    private fun accessibilityEnabled(): Boolean {
        val manager = getSystemService(AccessibilityManager::class.java)
        return manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK).any { service ->
            service.resolveInfo.serviceInfo?.let { ComponentName(this, it.name).packageName == packageName } == true
        }
    }

    private companion object {
        val NAVY = 0xFF0A1228.toInt()
        val TEXT_PRIMARY = 0xFFFFFFFF.toInt()
        val TEXT_MUTED = 0xFF94A3B8.toInt()
        val ACCENT_AMBER = 0xFFFBBF24.toInt()
    }
}