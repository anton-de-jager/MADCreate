using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("MADCreate", policy =>
    {
        var origins = (builder.Configuration["Cors:Origins"] ?? builder.Configuration["API_CORS_ORIGINS"] ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (origins.Length == 0)
        {
            policy.AllowAnyOrigin();
        }
        else
        {
            policy.WithOrigins(origins);
        }

        policy.AllowAnyHeader().AllowAnyMethod();
    });
});

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

var app = builder.Build();

app.UseCors("MADCreate");

var api = app.MapGroup("/v1");

api.MapGet("/health", () => Results.Ok(new
{
    status = "ok",
    app = "MADCreate",
    stack = ".NET Core",
    database = "MSSQL",
    checkedAt = DateTimeOffset.UtcNow
}));

api.MapPost("/auth/login", (LoginRequest request) =>
{
    var adminEmail = app.Configuration["DefaultUser:Email"] ?? app.Configuration["DEFAULT_USER_EMAIL"] ?? "admin@madprospects.com";
    var adminPassword = app.Configuration["DefaultUser:Password"] ?? app.Configuration["DEFAULT_USER_PASSWORD"] ?? "P@szw0rdMP";

    if (!string.Equals(request.Email, adminEmail, StringComparison.OrdinalIgnoreCase) || request.Password != adminPassword)
    {
        return Results.Json(new
        {
            ok = false,
            error = new
            {
                code = "AUTH_INVALID_CREDENTIALS",
                message = "Invalid email or password."
            }
        }, statusCode: StatusCodes.Status401Unauthorized);
    }

    var accessToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
    var refreshToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray());

    return Results.Ok(new
    {
        ok = true,
        data = new
        {
            user = new
            {
                id = "superadmin",
                email = adminEmail,
                firstName = "MADCreate",
                lastName = "Admin",
                avatarUrl = (string?)null,
                isSuperAdmin = true,
                emailVerified = true
            },
            tokens = new
            {
                accessToken,
                refreshToken,
                expiresIn = 3600,
                tokenType = "Bearer"
            },
            memberships = new[]
            {
                new
                {
                    workspaceId = "madcreate",
                    workspaceName = "MADCreate",
                    workspaceSlug = "madcreate",
                    role = "SUPER_ADMIN"
                }
            },
            currentWorkspaceId = "madcreate"
        }
    });
});

api.MapPost("/auth/refresh", () => Results.Ok(new
{
    ok = true,
    data = new
    {
        tokens = new
        {
            accessToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            refreshToken = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            expiresIn = 3600,
            tokenType = "Bearer"
        }
    }
}));

api.MapPost("/auth/logout", () => Results.Ok(new { ok = true, data = (object?)null }));

app.MapFallback(() => Results.NotFound(new { message = "MADCreate API endpoint not found" }));

app.Run();

record LoginRequest(string Email, string Password);
