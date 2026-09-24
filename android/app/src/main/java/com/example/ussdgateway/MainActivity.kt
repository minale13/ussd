package com.example.ussdgateway

import android.Manifest
import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
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
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {
    private lateinit var content: LinearLayout
    private val preferences by lazy { getSharedPreferences("ussd", MODE_PRIVATE) }

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
        view.addView(TextView(this).apply { text = "Enable Accessibility and phone-call access before starting USSD automation."; textSize = 16f; setPadding(0, 24, 0, 24) })
        view.addView(Button(this).apply { text = if (accessibilityEnabled()) "Accessibility enabled" else "Enable Accessibility"; isEnabled = !accessibilityEnabled(); setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) } })
        view.addView(Button(this).apply { text = if (callPermissionGranted()) "Call permission granted" else "Allow phone calls"; isEnabled = !callPermissionGranted(); setOnClickListener { ActivityCompat.requestPermissions(this@MainActivity, arrayOf(Manifest.permission.CALL_PHONE), 10) } })
        view.addView(Button(this).apply { text = "Continue"; isEnabled = accessibilityEnabled() && callPermissionGranted(); setOnClickListener { showChannels() } })
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