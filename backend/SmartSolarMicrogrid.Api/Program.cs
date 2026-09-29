/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: Program.cs
 * Description: Configuration of authentication, role based authorization,and account status
 * validation, user management services, MongoDB access, and initial Backoffice setup.
 */

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Filters;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Apply the account status and validation of sessions filter to every controller request.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AccountStatusFilter>();
});

// validataion and read the MongoDB settings required by the account services.
var connectionString = builder.Configuration["MongoDB:ConnectionString"];
var databaseName = builder.Configuration["MongoDB:DatabaseName"];
if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(databaseName))
{
    throw new InvalidOperationException("MongoDB connection string and database name are required.");
}

builder.Services.AddSingleton<IMongoClient>(_ =>
{
    // Creating one shared MongoDB client with short timeouts for connection
    var settings = MongoClientSettings.FromConnectionString(connectionString);
    settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
    settings.ConnectTimeout = TimeSpan.FromSeconds(5);
    return new MongoClient(settings);
});
builder.Services.AddSingleton<IMongoDatabase>(services =>
    services.GetRequiredService<IMongoClient>().GetDatabase(databaseName));

// Registration ofthe authentication and account management services used that are used by the API.
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<ProsumerService>();
builder.Services.AddSingleton<UserManagementService>();
builder.Services.AddSingleton<MicrogridNodeService>();
builder.Services.AddSingleton<BookingSlotService>();    //booking slots
builder.Services.AddSingleton<ReservationQueryService>();
builder.Services.AddSingleton<ReservationCommandService>();

// Configuration of JWT validation for authenticated Web and Android requests.
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
                //  When authentication is missing or invalid Returning a consistent response
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return context.Response.WriteAsJsonAsync(new { error = "Authentication is required." });
            },
            OnForbidden = context =>
            {
                // When the signed in role lacks permission returning response that has consistent format
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return context.Response.WriteAsJsonAsync(new { error = "You do not have permission to access this resource." });
            }
        };
    });

// Define the role policies used to protect account and administration endpoints.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(UserRoles.Backoffice, policy =>
        policy.RequireRole(UserRoles.Backoffice));
    options.AddPolicy(UserRoles.GridOperator, policy =>
        policy.RequireRole(UserRoles.GridOperator));
    options.AddPolicy(UserRoles.Prosumer, policy =>
        policy.RequireRole(UserRoles.Prosumer));
});

// Allowing any LAN origin so the web app and phone browser can call the API.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Automatic database seeding  
using (var scope = app.Services.CreateScope())
{
    // Preparing user storage and create the configuration of the Backoffice account when required.
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    var usersCollection = database.GetCollection<SmartSolarMicrogrid.Api.Models.User>("Users");

    // Enforcing unique non empty email addresses while allowing users without an email.
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

}

// Enabling the request pipeline before mapping the REST API controllers.
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
