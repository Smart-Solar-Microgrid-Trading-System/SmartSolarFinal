/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role-Based Authentication
 * File Name: Program.cs
 * Description: Configuratio of database access, authentication, authorization, and account services.
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

// Validatatio of each authenticated account and session.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AccountStatusFilter>();
});

builder.Services.AddDataProtection();

// Validatatio of MongoDB configuration.
var connectionString = builder.Configuration["MongoDB:ConnectionString"];
var databaseName = builder.Configuration["MongoDB:DatabaseName"];
if (string.IsNullOrWhiteSpace(connectionString) || string.IsNullOrWhiteSpace(databaseName))
{
    throw new InvalidOperationException("MongoDB connection string and database name are required.");
}

builder.Services.AddSingleton<IMongoClient>(_ =>
{
    // Creation the shared MongoDB client.
    var settings = MongoClientSettings.FromConnectionString(connectionString);
    settings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
    settings.ConnectTimeout = TimeSpan.FromSeconds(5);
    return new MongoClient(settings);
});
builder.Services.AddSingleton<IMongoDatabase>(services =>
    services.GetRequiredService<IMongoClient>().GetDatabase(databaseName));

// Register application services.
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<ProsumerService>();
builder.Services.AddSingleton<UserManagementService>();
builder.Services.AddSingleton<MicrogridNodeService>();
builder.Services.AddSingleton<BookingSlotService>();    //booking slots
builder.Services.AddSingleton<ReservationQueryService>();
builder.Services.AddSingleton<ReservationCommandService>();
builder.Services.AddSingleton<TransactionService>();

// Configure JWT authentication.
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
                // Return 401 when authentication fails.
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return context.Response.WriteAsJsonAsync(new { error = "Authentication is required." });
            },
            OnForbidden = context =>
            {
                // Return 403 when the role lacks permission.
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                return context.Response.WriteAsJsonAsync(new { error = "You do not have permission to access this resource." });
            }
        };
    });

// Configure role based policies.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(UserRoles.Backoffice, policy =>
        policy.RequireRole(UserRoles.Backoffice));
    options.AddPolicy(UserRoles.GridOperator, policy =>
        policy.RequireRole(UserRoles.GridOperator));
    options.AddPolicy(UserRoles.Prosumer, policy =>
        policy.RequireRole(UserRoles.Prosumer));
});

// Allow web and mobile clients to call the API.
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Initializing user storage and the Backoffice account.
using (var scope = app.Services.CreateScope())
{
    // Access the users collection.
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    var usersCollection = database.GetCollection<SmartSolarMicrogrid.Api.Models.User>("Users");

    // Enforcing unique non empty email addresses.
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

// Configuration of the HTTP request pipeline.
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.Run();
