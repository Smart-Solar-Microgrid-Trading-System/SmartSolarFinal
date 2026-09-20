# Smart Solar Microgrid Android app

This is the native Kotlin Android client. It calls the centralized C# API through IIS; it does not connect to MongoDB directly.

## First run in Android Studio

1. Open the `android` folder as a project.
2. Allow Gradle Sync to download the Android Gradle Plugin and Kotlin dependencies. Select JDK 17 if Android Studio asks.
3. Connect an Android device with USB debugging enabled (or create an emulator with Android 8/API 26 or newer), then select **Run**.
4. On the first run, open **Server Settings**, enter the IIS API address (for example `http://10.84.212.207:5000`), then tap **Test and save address**.

The address is saved only on that Android device. On later launches, the app automatically uses the saved address and checks the API. If the laptop joins a different LAN and receives a new IPv4 address, update it in **Server Settings**. HTTP is enabled strictly for the trusted academic demo LAN; production deployment should use HTTPS.

## Optional Google Maps setup

The committed `secrets.properties.example` is only a template. When the native
Google Map is implemented, copy it to `secrets.properties`, then add the team's
Android Maps key locally. Never commit that file or reuse a web Maps key here.

Until a valid Android Maps key is configured, the Map screen remains a safe
node-list/map placeholder rather than preventing the rest of the app from working.
