# ProGuard/R8 rules for the release build.
#
# The release build is minified (isMinifyEnabled = true), so anything R8 cannot
# see is referenced from Kotlin, reflection or Moshi has to survive explicitly.

# Retrofit keeps generic signatures on its suspend functions; without this the
# return types come back as null at runtime.
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepattributes AnnotationDefault

# Retrofit + OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# Moshi reflects over the data classes in Api.kt to build its JSON adapters.
# Both the interface and its response types must keep their names and fields.
-keep interface com.example.ussdgateway.GatewayApi { *; }
-keep class com.example.ussdgateway.PendingResponse { *; }
-keep class com.example.ussdgateway.PendingWithdrawal { *; }
-keepclassmembers class kotlin.Metadata { *; }
-keep,includedescriptorclasses class com.squareup.moshi.** { *; }

# The WebView calls AndroidGateway methods by name from JavaScript, so the
# @JavascriptInterface entry points must survive obfuscation under their
# original names or every button in the dashboard becomes a no-op.
-keepclassmembers class com.example.ussdgateway.MainActivity$DashboardBridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.example.ussdgateway.MainActivity { *; }

# Services and the boot receiver are referenced from the manifest only, which
# R8 cannot see as a reference.
-keep class com.example.ussdgateway.UssdPollingService { *; }
-keep class com.example.ussdgateway.UssdAccessibilityService { *; }
-keep class com.example.ussdgateway.BootReceiver { *; }
-keep class com.example.ussdgateway.Sims { *; }
-keep class com.example.ussdgateway.Credentials { *; }