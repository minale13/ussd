package com.example.ussdgateway

import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query

data class PendingResponse(val success: Boolean, val withdrawals: List<PendingWithdrawal>)
/** A claimed payout. `target_device_id` echoes the admin assignment; null or "ANY" means auto-assigned. */
data class PendingWithdrawal(val id: String, val transaction_id: String, val amount: String, val currency: String, val destination_type: String, val destination: String, val provider_transaction_id: String?, val channel: String?, val target_device_id: String? = null)

interface GatewayApi {
    /**
     * Polls for payouts this phone may execute. `x-device-id` must be the stable ANDROID_ID of the device so the
     * gateway only hands over withdrawals marked for "ANY" or targeted at this exact device.
     */
    @GET("api/withdrawals/pending")
    suspend fun pending(
        @Header("x-user-id") gatewayUserId: String,
        @Header("x-device-id") deviceId: String,
        @Header("x-phone-model") phoneModel: String,
        @Query("limit") limit: Int = 1
    ): PendingResponse
}