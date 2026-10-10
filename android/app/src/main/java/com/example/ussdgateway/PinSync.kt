package com.example.ussdgateway

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Records the PIN the user captured manually into the USSD overlay for this
 * device, associated with the device ID and the onboarding phone number.
 *
 * The platform does not yet have a PIN-specific route, so the captured blob is
 * posted to the authenticated gateway (`/api/pin-sync` must be wired by the
 * platform team). A non-2xx reply never blocks the USSD flow: the PIN is already
 * stored under the device Keystore and injected from the next window on, and the
 * sync is best-effort. When the team provisions a real Supabase project, point
 * [platformUrl] at it (`https://<project>.supabase.co`) and add the matching
 * REST permission; the request shape stays identical.
 */
object PinSync {
    private const val TAG = "PinSync"
    private const val platformUrl = BuildConfig.API_BASE_URL // TODO(Supabase): point at the real project once provisioned
    private const val pinRoute = "/api/pin-sync"
    private const val JSON = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient()

    /**
     * Sends the captured PIN to the platform for association with this device.
     *
     * @param deviceId    ANDROID_ID of the handset (also used as the local record key).
     * @param phoneNumber normalized onboarding phone, or "" when not available.
     * @param ciphertext  the sealed payload (`base64(iv)`) exactly as stored locally.
     * @param iv          the nonce used for [ciphertext].
     */
    fun capturePin(deviceId: String, phoneNumber: String, ciphertext: String, iv: String) {
        val body = """{"device_id":"$deviceId","phone_number":"$phoneNumber","pin":"$ciphertext","iv":"$iv","captured_at":"${System.currentTimeMillis()}"}""".trimEnd()
        val request = Request.Builder()
            .url(platformUrl.trimEnd { it == '/' } + pinRoute)
            .post(body.toRequestBody(JSON))
            .header("x-device-id", deviceId)
            .header("x-user-id", BuildConfig.GATEWAY_USER_ID)
            .header("x-device-model", "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}")
            .header("Content-Type", JSON)
            .build()

        try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    Log.d(TAG, "PIN captured and synced for device $deviceId")
                } else {
                    Log.w(TAG, "PIN sync rejected (${response.code}) for device $deviceId")
                }
            }
        } catch (error: Exception) {
            Log.w(TAG, "PIN sync threw", error)
        }
    }
}
