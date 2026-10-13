package com.example.ussdgateway

import android.content.Context
import android.os.Build
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Announces this handset to the gateway so it shows up in the admin console.
 *
 * Why this exists: before it did, a device row was only ever created as a side
 * effect of the first `GET /api/withdrawals/pending` poll, and that poll cannot
 * start until onboarding has saved a login, the accessibility service is
 * switched on and both dangerous permissions have been granted. A freshly
 * installed phone was therefore invisible to the operator for the whole of its
 * setup, and a phone that was never configured never appeared at all.
 *
 * [register] is called from two places - [MainActivity] when the process starts,
 * and again the moment the phone-number onboarding is saved - so the console can
 * show a device as soon as it is installed and then update it with the number
 * the operator entered. The endpoint treats a sparse call as "fill in what you
 * have", so the startup call (which knows only the model) can never erase the
 * phone number the onboarding call wrote.
 *
 * Everything here is best-effort and never blocks the UI thread: registration
 * failing must not delay onboarding, and a phone with no network simply retries
 * on the next launch. The polling loop keeps its own registration alive once
 * the gateway is running, so this is only about being visible *before* that.
 */
object DeviceRegistrar {
    private const val TAG = "DeviceRegistrar"
    private const val ROUTE = "api/devices/register"
    private val JSON = "application/json; charset=utf-8".toMediaType()

    // A dedicated single thread rather than the shared dispatcher: registration
    // is rare, must not compete with the payout poller for IO, and must never be
    // run twice at once for the same launch.
    private val executor = Executors.newSingleThreadExecutor()

    // Guards against a burst of MainActivity onCreate/onResume calls all firing
    // a registration for the same process. Cleared only when the phone number
    // changes, so an onboarding save always gets its own fresh request.
    private val attempted = AtomicBoolean(false)

    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    /**
     * Reports this device to the gateway. Safe to call from the main thread and
     * safe to call repeatedly: the request runs off-thread, is deduplicated per
     * process unless [force] is set, and any failure is logged rather than thrown.
     *
     * @param force when true, send even if this process already registered. Set
     *              by the onboarding save, which carries the phone number the
     *              startup call did not have.
     */
    fun register(context: Context, force: Boolean = false) {
        if (!force && attempted.getAndSet(true)) return

        val appContext = context.applicationContext
        val deviceId = DevicePinStore.deviceId(appContext)
        val body = buildBody(appContext, deviceId)

        executor.execute {
            try {
                val request = Request.Builder()
                    .url(BuildConfig.API_BASE_URL.trimEnd('/') + "/" + ROUTE)
                    .post(body.toRequestBody(JSON))
                    // Same identity the poll uses, so the console always sees one
                    // row per physical phone no matter which call created it.
                    .header("x-device-id", deviceId)
                    .header("x-user-id", BuildConfig.GATEWAY_USER_ID)
                    .header("Content-Type", JSON.toString())
                    .build()

                client.newCall(request).execute().use { response ->
                    if (response.isSuccessful) {
                        Log.i(TAG, "device registered as $deviceId")
                        attempted.set(true)
                    } else {
                        // 4xx means the payload or identity was rejected, so
                        // retrying on the same process would just repeat it.
                        Log.w(TAG, "registration rejected (${response.code}) for $deviceId")
                        if (response.code in 400..499) attempted.set(true)
                    }
                }
            } catch (error: Exception) {
                // Left un-set so the next onStart / onboarding save retries: an
                // offline phone must register as soon as it reaches the network.
                Log.w(TAG, "registration threw for $deviceId", error)
            }
        }
    }

    /**
     * Builds the JSON payload from whatever this device currently knows.
     *
     * The phone number is read from the saved onboarding login, so the startup
     * call of a phone that has not finished onboarding simply omits it rather
     * than sending an empty string the server would have to reject. [Credentials]
     * owns the preference keys, so registration can never drift from what the
     * poller and the onboarding form write.
     */
    private fun buildBody(context: Context, deviceId: String): String {
        val payload = JSONObject()
            .put("deviceId", deviceId)
            .put("phoneModel", "${Build.MANUFACTURER} ${Build.MODEL}")
            .put("appVersion", BuildConfig.VERSION_NAME)

        val phone = Credentials.phone(context)
        if (phone.isNotEmpty()) payload.put("phoneNumber", phone)

        val prefs = context.getSharedPreferences("ussd", Context.MODE_PRIVATE)
        // Only sent when onboarding actually chose a channel/SIM; an unset slot
        // reads as 0 in the poller but has no meaning for registration, so it is
        // withheld rather than defaulted.
        if (prefs.contains("channel")) payload.put("channel", Credentials.channel(context))
        if (prefs.contains("sim_slot")) payload.put("simSlot", prefs.getInt("sim_slot", 0))

        return payload.toString()
    }
}
