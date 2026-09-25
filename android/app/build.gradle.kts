plugins {
    id("com.android.application")
    kotlin("android")
}

// Fixed debug/release signing key, committed on purpose so APKs built locally
// and in CI share one signature and can be updated in place on a device.
val sharedKeystore = file("keystore.jks")
require(sharedKeystore.isFile) {
    "android/app/keystore.jks is missing; without the fixed signing key APKs can no longer be " +
        "updated in place. Regenerate it with keytool (see README, \"Android signing key\")."
}

android {
    namespace = "com.example.ussdgateway"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.example.ussdgateway"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
        buildConfigField("String", "API_BASE_URL", "\"http://10.0.2.2:3000/\"")
        buildConfigField("String", "GATEWAY_USER_ID", "\"replace-with-gateway-user-id\"")
        buildConfigField("String", "WEBHOOK_SECRET", "\"replace-with-payment-webhook-secret\"")
        buildConfigField("String", "USSD_PREFIX", "\"*806\"")
        buildConfigField("String", "USSD_PIN", "\"replace-with-ussd-pin\"")
    }

    signingConfigs {
        create("shared") {
            storeFile = sharedKeystore
            storeType = "JKS"
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        // Debug and release intentionally share this signature, so a new build
        // replaces an installed copy of the other variant without uninstalling.
        getByName("debug") { signingConfig = signingConfigs.getByName("shared") }
        getByName("release") { signingConfig = signingConfigs.getByName("shared") }
    }

    buildFeatures { buildConfig = true }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.activity:activity-ktx:1.10.0")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-service:2.8.7")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}