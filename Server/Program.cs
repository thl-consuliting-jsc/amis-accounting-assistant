using System.IO;
using System.Linq;
using AmisAssistant.Server.Repositories.Banking;
using AmisAssistant.Server.Repositories.Base;
using AmisAssistant.Server.Repositories.FixedAssets;
using AmisAssistant.Server.Repositories.Invoicing;
using AmisAssistant.Server.Repositories.MasterData;
using AmisAssistant.Server.Services.Banking;
using AmisAssistant.Server.Services.CashFlow;
using AmisAssistant.Server.Services.Contracts;
using AmisAssistant.Server.Services.CustomerPortal;
using AmisAssistant.Server.Services.EngineDomain;
using AmisAssistant.Server.Services.FixedAssets;
using AmisAssistant.Server.Services.Invoicing;
using AmisAssistant.Server.Services.MasterData;
using AmisAssistant.Server.Services.SystemDomain;
using AmisAssistant.Server.Services.Taxation;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
});

// Configure URLs: port 9092 (Client & API) and port 9093 (API) - support both IPv4 and IPv6
var urls = Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? "http://0.0.0.0:9092;http://0.0.0.0:9093;http://[::]:9092;http://[::]:9093";
builder.WebHost.UseUrls(urls);

// Add services to the container.
builder.Services.AddControllers();

// Register OOP Repositories
builder.Services.AddScoped<ICompanyRepository, CompanyRepository>();
builder.Services.AddScoped<IAccountingRuleRepository, AccountingRuleRepository>();
builder.Services.AddScoped<IPartnerRepository, PartnerRepository>();
builder.Services.AddScoped<IBankAccountRepository, BankAccountRepository>();
builder.Services.AddScoped<IBankTransactionRepository, BankTransactionRepository>();
builder.Services.AddScoped<IInvoiceRepository, InvoiceRepository>();
builder.Services.AddScoped<ICcdcRepository, CcdcRepository>();
builder.Services.AddScoped<IPartnerAliasRepository, PartnerAliasRepository>();

// Register Modular Domain Services (Clean Architecture / SOLID)
builder.Services.AddScoped<ISystemFileService, SystemFileService>();
builder.Services.AddScoped<IMasterDataService, MasterDataService>();
builder.Services.AddScoped<IBankingService, BankingService>();
builder.Services.AddScoped<IInvoicingService, InvoicingService>();
builder.Services.AddScoped<IFixedAssetsService, FixedAssetsService>();
builder.Services.AddScoped<IContractsService, ContractsService>();
builder.Services.AddScoped<ICashFlowService, CashFlowService>();
builder.Services.AddScoped<ICustomerPortalService, CustomerPortalService>();
builder.Services.AddScoped<ITaxationService, TaxationService>();
builder.Services.AddScoped<IEngineService, EngineService>();

// Configure CORS for Angular and Tauri UI
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    if (context.Request.Headers.ContainsKey("Access-Control-Request-Private-Network"))
    {
        context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
    }
    if (context.Request.Method == "OPTIONS")
    {
        context.Response.Headers["Access-Control-Allow-Origin"] = "*";
        context.Response.Headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS";
        context.Response.Headers["Access-Control-Allow-Headers"] = "*";
        context.Response.Headers["Access-Control-Allow-Private-Network"] = "true";
        context.Response.StatusCode = 204;
        return;
    }
    await next();
});

app.UseCors("AllowAll");

// Serve Angular Web Client
string currentDir = Directory.GetCurrentDirectory();
string[] clientCandidates = new[]
{
    Path.Combine(currentDir, "Client", "dist", "amt-chat-internal", "browser"),
    Path.Combine(AppContext.BaseDirectory, "Client"),
    Path.Combine(AppContext.BaseDirectory, "..", "Client", "dist", "amt-chat-internal", "browser"),
    @"D:\2026\1.Work\9.PHUONG\Client\dist\amt-chat-internal\browser"
};

string? clientDist = clientCandidates.FirstOrDefault(Directory.Exists);
if (clientDist != null)
{
    var fileProvider = new PhysicalFileProvider(clientDist);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = fileProvider
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = fileProvider
    });
}

app.UseAuthorization();

app.MapControllers();

if (clientDist != null)
{
    string indexPath = Path.Combine(clientDist, "index.html");
    if (File.Exists(indexPath))
    {
        app.MapFallback(async context =>
        {
            if (context.Request.Path.Value?.StartsWith("/api") != true)
            {
                context.Response.ContentType = "text/html; charset=utf-8";
                await context.Response.SendFileAsync(indexPath);
            }
            else
            {
                context.Response.StatusCode = 404;
            }
        });
    }
}

app.Run();
