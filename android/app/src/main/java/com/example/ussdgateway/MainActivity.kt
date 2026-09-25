package com.example.ussdgateway

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Typeface
import android.os.Bundle
import android.provider.Settings
import android.view.Gravity
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var content: LinearLayout
    private val preferences by lazy { getSharedPreferences("ussd", MODE_PRIVATE) }

    // Fires the standard CALL_PHONE request so Android shows its own
    // Allow / Deny dialog over this screen instead of sending users to Settings.
    private val callPermissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { showPermissions() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        showPermissions()
    }

    override fun onResume() {
        super.onResume()
        if (::content.isInitialized) showPermissions()
    }

    private fun base(title: String): LinearLayout {
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(48, 64, 48, 48); gravity = Gravity.CENTER_HORIZONTAL }
        content.addView(TextView(this).apply { text = title; textSize = 26f })
        setContentView(content)
        return content
    }

    private fun showPermissions() {
        val view = base("Required permissions")
        view.addView(TextView(this).apply { text = "USSD automation needs the accessibility service and phone-call access."; textSize = 16f; setPadding(0, 24, 0, 0) })

        view.addView(instruction("1. Turn on accessibility", "Android only allows this from system settings. Tap the button below, then in the Accessibility screen find \"USSD Gateway\" and switch it on."))
        view.addView(Button(this).apply { text = if (accessibilityEnabled()) "Accessibility enabled" else "ENABLE ACCESSIBILITY"; isEnabled = !accessibilityEnabled(); setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } })

        view.addView(instruction("2. Allow phone calls", "Tap the button below and choose Allow in the Android permission dialog that pops up at the bottom of the screen."))
        view.addView(Button(this).apply { text = if (callPermissionGranted()) "Phone permission granted" else "ALLOW PHONE CALLS"; isEnabled = !callPermissionGranted(); setOnClickListener { requestCallPermission() } })

        if (!callPermissionGranted() && callDialogBlocked()) {
            view.addView(TextView(this).apply { text = "Android is currently blocking the permission dialog for this app. If tapping the button does nothing, open Settings > Apps > USSD Gateway > Permissions > Phone, allow it, then come back."; textSize = 13f; setPadding(0, 16, 0, 0) })
        }

        view.addView(Button(this).apply { text = "Continue"; isEnabled = accessibilityEnabled() && callPermissionGranted(); setOnClickListener { showChannels() } })
    }

    private fun instruction(title: String, body: String) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(0, 32, 0, 0)
        addView(TextView(this@MainActivity).apply { text = title; textSize = 17f; setTypeface(null, Typeface.BOLD); layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT) })
        addView(TextView(this@MainActivity).apply { text = body; textSize = 14f; setPadding(0, 8, 0, 0); layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT) })
    }

    private fun requestCallPermission() {
        preferences.edit().putBoolean("call_requested", true).apply()
        callPermissionLauncher.launch(Manifest.permission.CALL_PHONE)
    }

    // The system dialog is the normal path; it stops appearing only after the
    // user picked "Don't ask again", which is worth pointing out when it happens.
    private fun callDialogBlocked(): Boolean {
        if (!preferences.getBoolean("call_requested", false)) return false
        return !shouldShowRequestPermissionRationale(Manifest.permission.CALL_PHONE)
    }

    private fun showChannels() {
        val view = base("Choose payment channel")
        val telebirr = RadioButton(this).apply { text = "Telebirr"; isChecked = preferences.getString("channel", "TELEBIRR") == "TELEBIRR" }
        val cbe = RadioButton(this).apply { text = "CBE"; isChecked = preferences.getString("channel", "TELEBIRR") == "CBE" }
        view.addView(RadioGroup(this).apply { orientation = RadioGroup.VERTICAL; addView(telebirr); addView(cbe) })
        view.addView(Button(this).apply { text = "Continue"; setOnClickListener { preferences.edit().putString("channel", if (cbe.isChecked) "CBE" else "TELEBIRR").apply(); showStart() } })
    }

    private fun showStart() {
        val view = base("USSD Gateway ready")
        view.addView(TextView(this).apply { text = "Channel: ${preferences.getString("channel", "TELEBIRR")}"; textSize = 18f; setPadding(0, 24, 0, 24) })
        view.addView(Button(this).apply { text = "START"; setOnClickListener { ContextCompat.startForegroundService(this@MainActivity, Intent(this@MainActivity, UssdPollingService::class.java)); isEnabled = false; text = "RUNNING" } })
    }

    private fun callPermissionGranted() = ContextCompat.checkSelfPermission(this, Manifest.permission.CALL_PHONE) == PackageManager.PERMISSION_GRANTED
    private fun accessibilityEnabled(): Boolean {
        val manager = getSystemService(AccessibilityManager::class.java)
        return manager.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK).any { service ->
            service.resolveInfo.serviceInfo?.let { ComponentName(this, it.name).packageName == packageName } == true
        }
    }
}