package com.example.ussdgateway

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
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
 * Dark fintech dashboard host. The dangerous permissions (phone calls, SIM state)
 * are asked for with Android's own Allow / Deny dialogs the moment the app starts,
 * and the only onboarding screen left is one card pointing at the accessibility
 * service - the grant that lives in system settings and can never be requested
 * from code. Behind it sits a WebView that renders assets/dashboard.html; the page
 * talks back through [DashboardBridge] to read live state and start/stop the gateway.
 * Saving an onboarding login starts the polling listener in the same bridge call, and
 * a gateway that was left running is resumed when the app opens again.
 */
class MainActivity : ComponentActivity() {
    private lateinit var content: LinearLayout
    private val preferences by lazy { getSharedPreferences("ussd", MODE_PRIVATE) }
    private var webView: WebView? = null
    private var dashboardShown = false

    // One launch asks for every dangerous permission that is still missing and
    // Android walks them with its own Allow / Deny dialogs.
    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { route() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = NAVY
        window.navigationBarColor = NAVY
        // Draw first so the system dialogs land on top of real content: the setup
        // card on a first launch, the dashboard once the service is already on.
        route()
        requestRuntimePermissions()
    }

    override fun onResume() {
        super.onResume()
        route()
    }

    // Keeps both screens in sync with reality: coming back from Settings with the
    // accessibility service switched on opens the dashboard, a revoked grant drops
    // back to the setup card, and a refresh while it is up just re-reads state.
    private fun route() {
        if (!accessibilityEnabled()) {
            showOnboarding()
        } else if (dashboardShown) {
            resumeGatewayIfNeeded()
            pushState()
        } else {
            showDashboard()
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

    /**
     * Accessibility is the only permission that needs an in-app guide because
     * Android exposes its grant solely from system settings.
     */
    private fun showOnboarding() {
        dashboardShown = false
        val view = base("One-time setup")
        val density = resources.displayMetrics.density
        val pad = (20 * density).toInt()

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(pad, pad, pad, pad)
            background = GradientDrawable().apply {
                cornerRadius = 18f * density
                setColor(CARD_FILL)
                setStroke((1 * density).toInt().coerceAtLeast(1), CARD_BORDER)
            }
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        }
        card.addView(TextView(this).apply {
            text = "Enable accessibility"
            textSize = 17f
            setTextColor(TEXT_PRIMARY)
            setTypeface(null, Typeface.BOLD)
        })
        card.addView(TextView(this).apply {
            text = "Turn on USSD Gateway in Accessibility settings. The dashboard opens when you return."
            textSize = 14f
            setTextColor(TEXT_MUTED)
            setPadding(0, (8 * density).toInt(), 0, (16 * density).toInt())
        })
        card.addView(Button(this).apply {
            text = "OPEN ACCESSIBILITY SETTINGS"
            setOnClickListener {
                startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
            }
        })
        view.addView(card)
    }

    /**
     * Asks for every dangerous permission still missing, once, with the standard
     * system dialogs as soon as the activity starts. Missing permissions are
     * requested again on a later app launch if the user denied them.
     */
    private fun requestRuntimePermissions() {
        val missing = REQUIRED_RUNTIME_PERMISSIONS.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) return
        permissionLauncher.launch(missing.toTypedArray())
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
        resumeGatewayIfNeeded()
        if (wv.url == null) wv.loadUrl("file:///android_asset/dashboard.html") else pushState()
    }

    /**
     * Brings the polling listener back up when the gateway was left running.
     * Saving a login (or tapping Start) records `gateway_active`, which survives
     * process death, so an app opened after the system reclaimed it returns
     * straight to the active view instead of asking for another tap.
     */
    private fun resumeGatewayIfNeeded() {
        UssdPollingService.startIfReady(this)
    }

    /**
     * Starts the foreground polling service exactly once. Shared by the Start
     * button and [DashboardBridge.setCredentials], so saving a login is all the
     * gateway needs to stay armed; the activity log row is written only on a
     * real start.
     */
    private fun ensureGateway() {
        if (UssdPollingService.running) return
        val channel = channelLabel(preferences.getString("channel", "TELEBIRR") ?: "TELEBIRR")
        val sim = preferences.getInt("sim_slot", 0) + 1
        ActivityLog.add(this, "success", "Gateway started · $channel · SIM $sim")
        UssdPollingService.start(this)
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
            // The snapshot is deliberately minimal. Payout history, device
            // fleet state and dispatch controls live in the server database
            // and are served by the web admin dashboard at /admin, so the
            // phone only ever ships what the orb and the settings sheet need.
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
         * phone and PIN are available to the automated USSD session, then starts
         * the polling listener so "Save & continue" is the whole onboarding.
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
            // Saving the login ends onboarding: bring the polling listener up in
            // the same call so the dashboard switches straight to its running,
            // minimal view without asking for a second tap.
            ensureGateway()
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
            ensureGateway()
            pushState()
        }

        @JavascriptInterface
        fun stopGateway() {
            applicationContext.stopService(Intent(applicationContext, UssdPollingService::class.java))
            ActivityLog.add(this@MainActivity, "info", "Gateway stopped")
            pushState()
        }

    }

    // -------------------------------------------------------------------- shared

    private fun callPermissionGranted() = ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
    private fun simPermissionGranted() = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED
    private fun channelLabel(channel: String) = if (channel == "CBE") "CBE" else "Telebirr"
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
        // Setup card: navy a shade lighter than the background, hairline border.
        val CARD_FILL = 0xFF111C36.toInt()
        val CARD_BORDER = 0x33FFFFFF.toInt()

        // The dangerous permissions the gateway cannot work without; everything
        // else in the manifest is install-time and needs no dialog. Requested
        // together from onCreate so Android walks its own Allow / Deny flow.
        val REQUIRED_RUNTIME_PERMISSIONS = listOf(
            Manifest.permission.CALL_PHONE,
            Manifest.permission.READ_PHONE_STATE
        )
    }
}