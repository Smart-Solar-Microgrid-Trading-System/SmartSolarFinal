import java.util.Properties
import java.io.FileInputStream

val localProperties = Properties()
val localPropertiesFile = rootProject.file("local.properties")

if (localPropertiesFile.exists()) {
    localProperties.load(FileInputStream(localPropertiesFile))
}

val mapsApiKey = localProperties.getProperty("MAPS_API_KEY", "")

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.smartsolarmicrogrid.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.smartsolarmicrogrid.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0"
        manifestPlaceholders["MAPS_API_KEY"] = project.findProperty("MAPS_API_KEY") ?: ""
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    dependencies {
        implementation("com.google.android.gms:play-services-maps:19.2.0")
        implementation("com.google.android.gms:play-services-location:21.3.0")

        implementation("com.google.mlkit:barcode-scanning:17.3.0")

        implementation("com.squareup.retrofit2:retrofit:2.11.0")
        implementation("com.squareup.retrofit2:converter-gson:2.11.0")

        implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

        implementation("androidx.recyclerview:recyclerview:1.4.0")
        implementation("androidx.cardview:cardview:1.0.0")
    }
}
dependencies {
    implementation("org.osmdroid:osmdroid-android:6.1.20")
}
