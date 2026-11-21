using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.EngineDomain;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Engine
{
    [ApiController]
    [Route("api/accounting")]
    public class AccountingEngineController : ControllerBase
    {
        private readonly IEngineService _engineService;

        public AccountingEngineController(IEngineService engineService)
        {
            _engineService = engineService;
        }

        [HttpGet("companies/{id}/reconciliation")]
        public async Task<ActionResult<ReconciliationDto>> GetReconciliation(int id)
        {
            var rec = await _engineService.GetLatestReconciliationAsync(id);
            if (rec == null) return NotFound(new { success = false, message = "Chưa có kỳ đối chiếu nào." });
            return Ok(new { success = true, data = rec });
        }

        [HttpGet("companies/{id}/files")]
        public async Task<ActionResult<IEnumerable<GeneratedFileDto>>> GetGeneratedFiles(int id, [FromQuery] int month = 10, [FromQuery] int year = 2026)
        {
            var files = await _engineService.GetGeneratedFilesAsync(id, month, year);
            return Ok(new { success = true, data = files });
        }

        [HttpGet("companies/{id}/logs")]
        public async Task<ActionResult<string>> GetLogs(int id, [FromQuery] int month = 10, [FromQuery] int year = 2026)
        {
            string logs = await _engineService.GetLatestLogAsync(id, month, year);
            return Ok(new { success = true, data = logs });
        }

        [HttpPost("companies/{id}/run-engine")]
        public async Task<ActionResult> RunEngine(int id, [FromBody] RunEngineRequest request)
        {
            var result = await _engineService.RunEngineAsync(id, request.Month, request.Year);
            return Ok(new
            {
                success = result.Success,
                message = result.Message,
                logs = result.Logs,
                files = result.Files,
                reconciliation = result.Reconciliation,
                fileCount = result.FileCount,
                outputDirectory = result.OutputDirectory
            });
        }
    }
}
