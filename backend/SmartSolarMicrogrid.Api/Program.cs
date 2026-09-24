using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Filters;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers(options =>
{
    options.Filters.Add<AccountStatusFilter>();
});

var connectionString = builder.Configuration["MongoDB:ConnectionString"];
var databaseName = builder.Configuration["MongoDB:DatabaseName"];
if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(databaseName))
{
    throw new InvalidOperationException("MongoDB connection string and database name are required.");
}

builder.Services.AddSingleton<IMongoClient>(_ =>
{
    var settings = MongoClientSettings.FromConnectionString(connectionString);
    settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
    settings.ConnectTimeout = TimeSpan.FromSeconds(5);
    return new MongoClient(settings);
});
builder.Services.AddSingleton<IMongoDatabase>(services =>
    services.GetRequiredService<IMongoClient>().GetDatabase(databaseName));

builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<ProsumerService>();
builder.Services.AddSingleton<UserManagementService>();
builder.Services.AddSingleton<MicrogridNodeService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<ReservationService>();
builder.Services.AddSingleton<BookingSlotService>();
builder.Services.AddSingleton<ReservationQueryService>();

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Secret"]!);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
        options.Events = new JwtBearerEvents
        {
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return context.Response.WriteAsJsonAsync(new { error = "Authentication is required." });
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return context.Response.WriteAsJsonAsync(new { error = "You do not have permission to access this resource." });
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(UserRoles.Backoffice, policy =>
        policy.RequireRole(UserRoles.Backoffice));
    options.AddPolicy(UserRoles.GridOperator, policy =>
        policy.RequireRole(UserRoles.GridOperator));
    options.AddPolicy(UserRoles.Prosumer, policy =>
        policy.RequireRole(UserRoles.Prosumer));
});

// Allow any LAN origin so the web app and phone browser can call the API.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Automatic database seeding — hashes are generated at runtime using BCrypt
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    var usersCollection = database.GetCollection<SmartSolarMicrogrid.Api.Models.User>("Users");

    // Enforce unique non-empty email addresses while allowing users without an email.
    var emailIndex = new CreateIndexModel<SmartSolarMicrogrid.Api.Models.User>(
        Builders<SmartSolarMicrogrid.Api.Models.User>.IndexKeys.Ascending(user => user.Email),
        new CreateIndexOptions<SmartSolarMicrogrid.Api.Models.User>
        {
            Name = "unique_email_when_present",
            Unique = true,
            PartialFilterExpression = new BsonDocument("Email", new BsonDocument("$type", "string"))
        });
    await usersCollection.Indexes.CreateOneAsync(emailIndex);

    var seedUsername = builder.Configuration["SeedBackoffice:Username"]?.Trim();
    var seedPassword = builder.Configuration["SeedBackoffice:Password"];
    var seedFullName = builder.Configuration["SeedBackoffice:FullName"]?.Trim();
    var seedEmail = builder.Configuration["SeedBackoffice:Email"]?.Trim().ToLowerInvariant();

    if (string.IsNullOrWhiteSpace(seedUsername) || string.IsNullOrWhiteSpace(seedPassword) ||
        string.IsNullOrWhiteSpace(seedFullName) || string.IsNullOrWhiteSpace(seedEmail))
    {
        app.Logger.LogWarning("No initial Backoffice account was seeded because SeedBackoffice local configuration is incomplete.");
    }
    else if (!await usersCollection.Find(user => user.Id == seedUsername).AnyAsync())
    {
        if (await usersCollection.Find(user => user.Email == seedEmail).AnyAsync())
        {
            app.Logger.LogWarning("No initial Backoffice account was seeded because its configured email address is already in use.");
        }
        else
        {
            await usersCollection.InsertOneAsync(new SmartSolarMicrogrid.Api.Models.User
            {
                Id = seedUsername,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(seedPassword),
                Role = UserRoles.Backoffice,
                FullName = seedFullName,
                Email = seedEmail,
                AccountStatus = AccountStatuses.Active
            });
            app.Logger.LogInformation("Initial Backoffice account seeded from local configuration.");
        }
    }

    // Seed map-demo nodes once. Later node-management changes are never overwritten at startup.
    var nodesCollection = database.GetCollection<MicrogridNode>("MicrogridNodes");
    var seedNodes = new List<MicrogridNode>
    {
        new() { Id = "node-colombo-central", Name = "Colombo Central Hub", Latitude = 6.9271, Longitude = 79.8612, CapacityKw = 250, AvailableBatterySlots = 12, IsActive = true },
        new() { Id = "node-battaramulla", Name = "Battaramulla Solar Hub", Latitude = 6.9022, Longitude = 79.9181, CapacityKw = 180, AvailableBatterySlots = 8, IsActive = true },
        new() { Id = "node-maharagama", Name = "Maharagama Energy Hub", Latitude = 6.8480, Longitude = 79.9280, CapacityKw = 150, AvailableBatterySlots = 6, IsActive = true }
    };
    foreach (var node in seedNodes)
    {
        var exists = await nodesCollection.Find(existingNode => existingNode.Id == node.Id).AnyAsync();
        if (!exists)
        {
            await nodesCollection.InsertOneAsync(node);
        }
    }

    // Create reservation uniqueness protection before accepting reservation requests.
    await scope.ServiceProvider.GetRequiredService<ReservationService>().EnsureIndexesAsync();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
