using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Misa
{
    [ApiController]
    [Route("api/accounting/misa-reports")]
    public class MisaReportsController : ControllerBase
    {
        private static string? FindDataFile()
        {
            string[] candidates = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Client", "assets", "data", "misa_reports_full.json"),
                Path.Combine(AppContext.BaseDirectory, "..", "Client", "src", "assets", "data", "misa_reports_full.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "Client", "src", "assets", "data", "misa_reports_full.json"),
                @"D:\2026\1.Work\9.PHUONG\Client\src\assets\data\misa_reports_full.json"
            };

            foreach (var p in candidates)
            {
                if (System.IO.File.Exists(p)) return p;
            }
            return null;
        }

        [HttpGet("full")]
        public async Task<IActionResult> GetFullData()
        {
            var path = FindDataFile();
            if (path == null)
            {
                return NotFound(new { success = false, message = "misa_reports_full.json not found" });
            }

            var json = await System.IO.File.ReadAllTextAsync(path);
            return Content(json, "application/json");
        }

        [HttpGet("catalog")]
        public async Task<IActionResult> GetCatalog()
        {
            var path = FindDataFile();
            if (path == null) return NotFound(new { success = false, message = "File not found" });

            using var doc = JsonDocument.Parse(await System.IO.File.ReadAllTextAsync(path));
            if (doc.RootElement.TryGetProperty("catalog", out var cat) && doc.RootElement.TryGetProperty("categories", out var cats))
            {
                var result = JsonSerializer.Serialize(new
                {
                    success = true,
                    categories = cats,
                    catalog = cat
                });
                return Content(result, "application/json");
            }
            return Content(await System.IO.File.ReadAllTextAsync(path), "application/json");
        }

        [HttpGet("data/{reportCode}")]
        public async Task<IActionResult> GetReportData(string reportCode)
        {
            var path = FindDataFile();
            if (path == null) return NotFound(new { success = false, message = "File not found" });

            using var doc = JsonDocument.Parse(await System.IO.File.ReadAllTextAsync(path));
            if (doc.RootElement.TryGetProperty("data", out var dataProp))
            {
                if (dataProp.TryGetProperty(reportCode, out var rows))
                {
                    var result = JsonSerializer.Serialize(new { success = true, reportCode = reportCode, rows = rows });
                    return Content(result, "application/json");
                }
            }
            return Ok(new { success = true, reportCode = reportCode, rows = Array.Empty<object>() });
        }
    }
}
