plugins {
    id("com.android.application")
    kotlin("android")
}

// ---------------------------------------------------------------------------
// Build-time configuration
//
// Every value the app needs to talk to a backend is resolved here, once, from
// either a Gradle property (-Pfoo=bar, or ~/.gradle/gradle.properties) or the
// matching environment variable. That is what lets the same project produce a
// debug APK pointing at a laptop and a release APK pointing at the deployed web
// admin, with no source edit:
//
//   gradlew assembleRelease -PAPI_BASE_URL=https://withdrawal.example.com/
//
// android/local.properties (git-ignored) or exported env vars both work; the
// property wins when both are present.
// ---------------------------------------------------------------------------
fun config(name: String, default: String): String =
    (project.findProperty(name) as String?) ?: System.getenv(name) ?: default

/**
 * Retrofit's baseUrl must end in "/", and an HTTP URL is only usable when the
 * manifest permits cleartext for that host. Fail the build here rather than
 * shipping an APK whose every request throws at runtime.
 */
fun backendUrl(raw: String): String {
    val url = raw.trim().let { if (it.endsWith("/")) it else "$it/" }
    require(url.startsWith("http://") || url.startsWith("https://")) {
        "API_BASE_URL must start with http:// or https:// (got \"$raw\")"
    }
    return url
}

val apiBaseUrl = backendUrl(config("API_BASE_URL", "http://10.0.2.2:3000/"))
val gatewayUserId = config("GATEWAY_USER_ID", "replace-with-gateway-user-id")
val webhookSecret = config("WEBHOOK_SECRET", "replace-with-payment-webhook-secret")
val ussdPrefix = config("USSD_PREFIX", "*806")
val ussdPin = config("USSD_PIN", "replace-with-ussd-pin")

// A release APK must not be shipped with the "replace-with-..." placeholders:
// those builds silently authenticate as nobody and sign webhooks with a
// published key. Debug builds keep them so the project still opens and runs.
if (gradle.startParameter.taskNames.any { it.contains("Release", ignoreCase = true) }) {
    listOf(
        "GATEWAY_USER_ID" to gatewayUserId,
        "WEBHOOK_SECRET" to webhookSecret,
        "USSD_PIN" to ussdPin
    ).forEach { (key, value) ->
        require(!value.startsWith("replace-with-")) {
            "$key is still a placeholder; pass -P$key=<value> (or export $key) before building a release APK"
        }
    }
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
        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
        buildConfigField("String", "GATEWAY_USER_ID", "\"$gatewayUserId\"")
        buildConfigField("String", "WEBHOOK_SECRET", "\"$webhookSecret\"")
        buildConfigField("String", "USSD_PREFIX", "\"$ussdPrefix\"")
        buildConfigField("String", "USSD_PIN", "\"$ussdPin\"")
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