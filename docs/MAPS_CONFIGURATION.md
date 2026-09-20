# Google Maps configuration

Google Maps is an optional presentation integration. Microgrid node data remains
owned by the central C# API (`GET /api/nodes`); neither client connects directly
to MongoDB.

## Team rule

Never commit a real Google Maps API key. Each client uses a separate key because
their Google Cloud restrictions differ.

| Client | Local file | Configuration name | Required Google API restriction |
| --- | --- | --- | --- |
| React web portal | `web/.env.local` | `VITE_GOOGLE_MAPS_API_KEY` | Maps JavaScript API |
| Native Android app | `android/secrets.properties` | `MAPS_API_KEY` | Maps SDK for Android |

The repository contains safe templates:

- `web/.env.example`
- `android/secrets.properties.example`

## Web prototype

For a limited-time academic LAN demo, the web key may have no website-referrer
restriction if the IIS laptop IP changes frequently. It must still be restricted
to **Maps JavaScript API** and have a low quota/budget alert. A browser key is
visible in the compiled web bundle, so it is not a server secret.

Google's Maps Demo Key can be used only for a temporary Maps JavaScript API
prototype. Retain the node table as a fallback when a map key, internet
connection, or demo quota is unavailable.

## Android

Use a distinct Android key, restricted by application package name and signing
certificate SHA-1 fingerprint. Do not use the web Maps key or JavaScript Demo Key
in the native Android app.

## Before implementation

The member implementing each map should confirm the Google Cloud project owner,
billing/demo-key choice, required API, and key restrictions before adding the
Google Maps dependency or map-rendering code.
