package com.example.ussdgateway

import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

data class PendingResponse(val success: Boolean, val withdrawals: List<PendingWithdrawal>)
/**
 * A claimed payout. `target_device_id` echoes the admin assignment; null or "ANY" means auto-assigned.
 * `bank` is the canonical bank code the gateway routed this payout to (TELEBIRR, CBEBIRR, ...),
 * resolved server-side even for older rows that only ever carried `channel`.
 */
data class PendingWithdrawal(val id: String, val transaction_id: String, val amount: String, val currency: String, val destination_type: String, val destination: String, val provider_transaction_id: String?, val channel: String?, val bank: String? = null, val target_device_id: String? = null)

interface GatewayApi {
    /**
     * Polls for payouts this phone may execute. `x-device-id` must be the stable ANDROID_ID of the device so the
     * gateway only hands over withdrawals marked for "ANY" or targeted at this exact device.
     *
     * The remaining `x-device-*` headers are fleet telemetry: the web admin
     * dashboard at /admin shows the active SIM/channel, battery and network
     * for every registered phone. They are advisory and never gate the claim,
     * so a value the platform will not report is simply omitted.
     */
    @GET("api/withdrawals/pending")
    suspend fun pending(
        @Header("x-user-id") gatewayUserId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-phone-model") phoneModel: String,
        @Header("x-device-channel") channel: String? = null,
        @Header("x-device-sim") simSlot: Int? = null,
        @Header("x-device-carrier") carrier: String? = null,
        @Header("x-device-battery") batteryLevel: Int? = null,
        @Header("x-device-network") networkType: String? = null,
        @Query("limit") limit: Int = 1
    ): PendingResponse
}