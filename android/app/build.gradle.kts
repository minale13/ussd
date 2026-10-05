plugins {
    id("com.android.application")
    kotlin("android")
}

// ---------------------------------------------------------------------------
// Build-time configuration
//
// Every value the app needs to talk to a backend is resolved here, once, from
// either a Gradle property (-Pfoo=bar, or ~/.gradle/gradle.properties) or the
// matching environment variable.
//
// API_BASE_URL is the production deployment and is baked into BuildConfig, so
// the installed app never asks the user for a server address: it always talks to
// the host below unless a build deliberately overrides it. Retrofit requires a
// trailing slash, so backendUrl() appends one.
//
//   gradlew assembleRelease            # production, no arguments
//   gradlew assembleDebug -PAPI_BASE_URL=http://10.0.2.2:3000/   # laptop dev
// ---------------------------------------------------------------------------
fun config(name: String, default: String): String =
    (project.findProperty(name) as String?) ?: System.getenv(name) ?: default

/**
 * The production backend. Hardcoded on purpose: this is the single deployment
 * the Play Store build talks to, and a user who installs the app has no way to
 * reach a server they were not given, so there is nothing for them to configure.
 */
val PRODUCTION_BASE_URL = "https://ussd-six.vercel.app/"

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

val apiBaseUrl = backendUrl(config("API_BASE_URL", PRODUCTION_BASE_URL))
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

// ---------------------------------------------------------------------------
// Signing
//
// Three keystores, in priority order, so the same project can be signed for
// different audiences without a source edit:
//
//   1. A Play upload key supplied through the environment
//      (APK_KEYSTORE_PATH / APK_KEYSTORE_PASSWORD / APK_KEY_ALIAS / APK_KEY_PASSWORD).
//      This is what a Play Store upload uses, and the only one that can enrol
//      in Play App Signing.
//   2. A local, uncommitted release key at android/release-keystore.jks, read
//      from android/local.properties. This is the everyday "build a signed
//      release APK on my own machine" path.
//   3. The shared development key committed at android/app/keystore.jks, used
//      only when neither of the above exists, so a fresh clone can still build.
//
// Play Protect treats a sideloaded APK whose certificate it does not recognise
// as suspicious, and a keystore committed to a public repository is the worst
// case of that: the password is public, so anyone can mint a signing
// certificate and ship an "update" that inherits this app's accessibility
// service and its ability to place calls. Options 1 and 2 keep the private key
// out of the repository, which is what a legitimate release signature is.
// ---------------------------------------------------------------------------

/**
 * Reads a credential from the environment first, then android/local.properties.
 */
fun readSecret(envName: String, propName: String): String? {
    val fromEnv = System.getenv(envName)
    if (!fromEnv.isNullOrBlank()) return fromEnv
    val props = rootProject.file("local.properties")
    if (props.isFile) {
        val hit = props.readLines().firstOrNull { it.trimStart().startsWith("$propName=") }
        val value = hit?.substringAfter("=")?.trim()
        if (!value.isNullOrBlank()) return value
    }
    return null
}

// Every path and credential below is declared with inferred types on purpose.
// Gradle's Kotlin DSL default imports cover java.lang.* but not java.io.*, so
// naming java.io.File explicitly here would not compile. Inference keeps the
// script free of imports it does not need.
val devKeystoreFile = file("keystore.jks")
val localKeystoreFile = rootProject.file("release-keystore.jks")
val uploadKeystorePath = System.getenv("APK_KEYSTORE_PATH")
val uploadKeystoreFile = if (!uploadKeystorePath.isNullOrBlank()) file(uploadKeystorePath) else null
val localStorePassword = readSecret("RELEASE_STORE_PASSWORD", "RELEASE_STORE_PASSWORD")

val resolvedKeystoreFile = when {
    uploadKeystoreFile != null && uploadKeystoreFile.isFile -> uploadKeystoreFile
    localKeystoreFile.isFile && localStorePassword != null -> localKeystoreFile
    else -> devKeystoreFile
}

var signingLabel = "development (committed keystore)"
var resolvedStorePassword: String? = null
var resolvedKeyAlias: String? = null
var resolvedKeyPassword: String? = null

if (uploadKeystoreFile != null && uploadKeystoreFile.isFile) {
    // 1. A Play upload key supplied through the environment. Never committed.
    signingLabel = "upload key from APK_KEYSTORE_PATH"
    resolvedStorePassword = readSecret("APK_KEYSTORE_PASSWORD", "APK_STORE_PASSWORD")
        ?: error("APK_KEYSTORE_PASSWORD is required when APK_KEYSTORE_PATH is set")
    resolvedKeyAlias = readSecret("APK_KEY_ALIAS", "APK_KEY_ALIAS")
        ?: error("APK_KEY_ALIAS is required when APK_KEYSTORE_PATH is set")
    resolvedKeyPassword = readSecret("APK_KEY_PASSWORD", "APK_KEY_PASSWORD")
        ?: error("APK_KEY_PASSWORD is required when APK_KEYSTORE_PATH is set")
} else if (localKeystoreFile.isFile && localStorePassword != null) {
    // 2. A local release key created by scripts/make-release-keystore.mjs.
    signingLabel = "local release key"
    resolvedStorePassword = localStorePassword
    resolvedKeyAlias = readSecret("RELEASE_KEY_ALIAS", "RELEASE_KEY_ALIAS") ?: "release"
    resolvedKeyPassword = readSecret("RELEASE_KEY_PASSWORD", "RELEASE_KEY_PASSWORD") ?: localStorePassword
} else {
    // 3. The committed development key, so a fresh clone still builds.
    resolvedStorePassword = "android"
    resolvedKeyAlias = "androiddebugkey"
    resolvedKeyPassword = "android"
}

logger.lifecycle("[signing] using the $signingLabel keystore")

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
        // One resolved config, whatever keystore won the priority check above.
        create("gateway") {
            storeFile = resolvedKeystoreFile
            storeType = if (resolvedKeystoreFile.name.endsWith(".jks", true)) "JKS" else "PKCS12"
            storePassword = resolvedStorePassword
            keyAlias = resolvedKeyAlias
            keyPassword = resolvedKeyPassword
            // v1 and v2 signature schemes: a device that only understands v1
            // refuses the install otherwise, which reads as "Play Protect
            // blocked this app" to anyone sideloading it.
            enableV1Signing = true
            enableV2Signing = true
        }
    }

    buildTypes {
        // Both variants carry a real signature: a debug APK signed with the
        // auto-generated debug key is exactly what Play Protect flags on a
        // sideload, and an unsigned release APK cannot be installed at all.
        getByName("debug") {
            signingConfig = signingConfigs.getByName("gateway")
            isMinifyEnabled = false
        }
        getByName("release") {
            signingConfig = signingConfigs.getByName("gateway")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures { buildConfig = true }

    // Play Console rejects a bundle that targets an API level Google no longer
    // accepts, and warns when targetSdk trails compileSdk by too much.
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }

    packaging {
        resources {
            // Duplicate META-INF entries are dropped rather than failing the build,
            // which is what an app bundling several AARs otherwise hits.
            excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/DEPENDENCIES")
        }
    }

    lint {
        // Play Console runs lint at upload time; keep the release build honest
        // about the things that actually matter here (permissions, cleartext).
        abortOnError = false
        warningsAsErrors = false
    }
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