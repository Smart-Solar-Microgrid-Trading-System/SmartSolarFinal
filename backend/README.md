# Smart Solar Microgrid API

Initial C# ASP.NET Core controller-based API targeting .NET 10.
The SDK baseline is 10.0.400, allowing later patches in the same feature band.
Run the commands below from the `backend` directory so its `global.json` applies.

## First-time developer setup

1. Install the .NET SDK version specified in `global.json` and start a local MongoDB
   service.
2. Copy `SmartSolarMicrogrid.Api/appsettings.Development.json.example` to
   `SmartSolarMicrogrid.Api/appsettings.Development.json`.
3. Set a unique local value for `Jwt:Secret` and complete the `SeedBackoffice` section.
   On its first start with an empty database, the API creates this one Active Backoffice
   account. Its password is BCrypt-hashed; Git never receives the chosen password.
4. Build and run the API using the commands below. This local file is intentionally
   ignored by Git; never commit secrets, production connection strings, certificates,
   seed passwords, or machine-specific paths. The API configuration can also be
   supplied through environment variables, for example `MongoDB__ConnectionString`,
   `MongoDB__DatabaseName`, and `Jwt__Secret`.

`appsettings.json` contains only development-safe defaults. Before any shared or
production deployment, supply a distinct, secret JWT signing key outside source
control.

## Build and run

```powershell
dotnet build SmartSolarMicrogrid.Api/SmartSolarMicrogrid.Api.csproj
dotnet run --project SmartSolarMicrogrid.Api --launch-profile http
```

Open `http://localhost:5080/health` or run:

```powershell
Invoke-RestMethod http://localhost:5080/health
```

Expected HTTP status: `200 OK`. Expected JSON:

```json
{"status":"ok","service":"SmartSolarMicrogrid.Api"}
```

The `/health` endpoint checks API availability only. It does not check MongoDB,
authenticate users, or implement business features.

## MongoDB connection and readiness

The API uses the official `MongoDB.Driver` NuGet package, pinned to version 3.11.2.
The first build restores it. Keep the local MongoDB Windows service running.
The defaults in `appsettings.json` are:

```json
"MongoDB": {
  "ConnectionString": "mongodb://127.0.0.1:27017",
  "DatabaseName": "SmartSolarMicrogrid"
}
```

Each developer runs MongoDB on their own laptop. Only the API connects to MongoDB;
phones and browsers connect to the API. For a different local connection, override
`MongoDB__ConnectionString` and `MongoDB__DatabaseName` through process environment
variables. Do not commit passwords in configuration files.

After rebuilding and restarting the local API, open
`http://localhost:5080/health/ready`.

- HTTP **200**: `{"status":"ready","database":"reachable"}`
- HTTP **503** when MongoDB is unavailable:
  `{"status":"not_ready","database":"unreachable"}`

The readiness check sends a read-only `ping` with a five-second deadline. It does
not create a database, collection or account, or prove collection read/write
permissions. MongoDB creates the database when data is first written, so it may
not appear in database tools yet. `/health` remains available during a database
outage. Internal connection details are not returned to clients.

If Visual Studio has the app running, stop that development instance before
rebuilding when files are locked. A code change must be rebuilt/restarted to
test the updated endpoint.

## Hosting status

The Visual Studio development profile listens on localhost:5080 only.
Each hosting laptop configures its own IIS deployment using:

- Site and application pool: `SmartSolarMicrogrid.Api`
- Published directory: a local folder chosen by the hosting member, for example
  `C:\Deploy\SmartSolarMicrogrid\api`
- HTTP binding: all local addresses, port `5000`, no host name
- Application pool: No Managed Code, 64-bit, ApplicationPoolIdentity
- Folder permission: read/execute for this application pool
- Firewall rule: `SmartSolarMicrogrid-Api-LAN`, inbound TCP 5000,
  Private network profile, LocalSubnet clients only

IIS starts the published application independently of Visual Studio.
Editing source files or building in Visual Studio does not update this deployed copy.
The source now includes MongoDB integration. The existing IIS copy must be
republished before `/health/ready` is available there; adding source files does
not update the deployed application.

### Publish directly from Visual Studio

Each member creates their own local Visual Studio Folder publish profile. Copy
`Properties/PublishProfiles/IISFolder.pubxml.example` to
`Properties/PublishProfiles/IISFolder.pubxml`, then replace both placeholder paths
with a folder on that member's machine. The real `.pubxml` profile is intentionally
ignored by Git; do not commit it. Before publishing, copy
`appsettings.Production.json.example` to `appsettings.Production.json` and set a
unique JWT secret and initial Backoffice password on that IIS laptop. No manual
copying from `bin` is needed.

1. Right-click the **SmartSolarMicrogrid.Api project** in Solution Explorer and
   choose **Publish**.
2. Select the local **IISFolder** profile. If it does not appear, reload the project
   and reopen Publish.
3. Check that the target folder is correct for the current machine and the
   configuration is **Release**. The deployment is framework-dependent and needs
   the .NET 10 runtime/Hosting Bundle on the host.
4. Stop the corresponding IIS application pool in IIS Manager before publishing to
   release its files.
5. Click **Publish** and wait for the success message.
6. Start the same application pool and open its configured `/health` URL.
   If publishing fails, review the error before assuming the deployment is usable.

This profile copies files only; it does not configure IIS, change firewall rules,
or stop/start the application pool automatically. It preserves unrelated files in
the destination. Your Windows account needs write permission to that directory.
Members should use their own local profile and deployment folder; never change a
tracked file to record a personal path.

### Initial Backoffice account

`SeedBackoffice` is optional local configuration used only to bootstrap an empty
database. The API creates the configured Active Backoffice account only when its
username does not already exist; later restarts preserve its password and profile.
After signing in, Backoffice creates Grid Operator accounts through the normal web
user-management flow, and Prosumers self-register.

For an existing local database created by the earlier default-account setup, use a
new local database name or deliberately remove only the old test account before
testing the new seed credentials. The API intentionally does not delete or reset
existing accounts.

Use Visual Studio's **http** run profile on port 5080 for daily development.
Publish to IIS when you want the deployed API version on port 5000 to reflect changes.

### Separate React web UI deployment

The React web UI is hosted separately from this API. Build it from the repository
root:

```powershell
Set-Location web
npm run build
```

The build output is `web\dist`. Configure a separate IIS static site for that
folder with an HTTP binding on port `8080`; IIS URL Rewrite is required for React
client-side routes such as `/login`. Configure this API as its own IIS site with an
HTTP binding on port `5000`. Both sites may run on the same laptop, but they are
separate deployments. The web and Android clients call the API at
`http://<server-LAN-IP>:5000`; neither client connects to MongoDB directly.

### First-time IIS setup on another Windows laptop

Install/enable IIS and the matching .NET Hosting Bundle first. Publish using the
Visual Studio instructions above; skip stopping/starting a pool that does not yet exist.
In IIS Manager, create the API site and application pool using the settings above.
Grant `IIS AppPool\SmartSolarMicrogrid.Api` read/execute access to the deployment
folder. Enable Anonymous Authentication for the site and select Application pool
identity in its Edit dialog. In Windows Firewall, allow inbound TCP port 5000
on Private networks with remote addresses limited to LocalSubnet.
Check for existing sites and port conflicts before creating these resources.
Create the separate React IIS site with physical path `web\dist`, port `8080`, and
its own inbound TCP 8080 Private-network firewall rule. This setup is performed
once per hosting laptop.

### Verification

On the host: `http://localhost:5000/health` and `http://localhost:8080/login`.
From another device: `http://<server-laptop-LAN-IP>:5000/health` and
`http://<server-laptop-LAN-IP>:8080/login`.
Both devices must be on the same LAN/hotspot with peer communication allowed.
The server network must be Private for the scoped firewall rule to apply.
Use `ipconfig` to find the current Wi-Fi IPv4 address; it can change when changing networks.

This is HTTP for the current academic LAN demonstration; transport security should
be revisited before any non-demo deployment involving login or personal data.

## Next milestones

1. Republish the updated API to IIS when ready to deploy.
2. Rebuild the web UI with `npm run build` after web changes.
3. Verify `/health/ready`, the separate web login page, and Android API access over LAN.
