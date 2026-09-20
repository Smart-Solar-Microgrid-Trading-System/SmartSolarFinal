# Smart Solar Microgrid Web Portal

React (ES6), Tailwind CSS, and shadcn/ui components provide the web UI for
Backoffice and Grid Operator users. Business rules remain in the central C# Web API.

## Team setup

1. Run `npm install` from this directory.
2. Run `npm run dev`.

For the split IIS deployment, leave `VITE_API_BASE_URL` unset. The UI uses the
current browser hostname with API port `5000`: a browser opened at
`http://<server-LAN-IP>:8080` calls `http://<server-LAN-IP>:5000`.

For Vite development while the API uses its `http` launch profile, copy
`.env.example` to `.env.local` and set `VITE_API_BASE_URL=http://localhost:5080`.
To use another API host, set the same variable to that API address instead.

The same local file contains the optional `VITE_GOOGLE_MAPS_API_KEY` placeholder
for the future `/nodes` map. Use a separate Maps JavaScript API key; values
starting with `VITE_` are included in the built browser files, so restrict the
real key to the Maps JavaScript API. The node table continues to work without it.

Never commit `.env.local`. A phone/browser must use the IIS host's LAN URL, not
`localhost`, because `localhost` on a phone refers to the phone itself.

## Current web functionality

- Backoffice/Grid Operator login through `POST /api/auth/login`
- JWT session handling and role-aware navigation
- Backoffice creation of Backoffice/Grid Operator users
- Backoffice Pending Prosumer listing and account-status updates

The web client communicates exclusively with the central REST API; it does not
connect directly to MongoDB or hold business rules.

## Separate IIS web deployment

Run `npm run build` to create the independent static deployment in `dist`.
Configure a separate IIS site for this folder with an HTTP binding on port `8080`.
The included `dist/web.config` requires IIS URL Rewrite so client-side routes such
as `/login` return `index.html`. The C# API is a separate IIS site on port `5000`.

From a phone or browser on the same LAN, open:

```text
http://<server-LAN-IP>:8080/login
```

The web UI calls `http://<server-LAN-IP>:5000/api/...`; it never connects to
MongoDB directly.
