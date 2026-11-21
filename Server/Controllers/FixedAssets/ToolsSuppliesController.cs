using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.FixedAssets;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.FixedAssets
{
    [ApiController]
    [Route("api/accounting")]
    public class ToolsSuppliesController : ControllerBase
    {
        private readonly IFixedAssetsService _fixedAssetsService;

        public ToolsSuppliesController(IFixedAssetsService fixedAssetsService)
        {
            _fixedAssetsService = fixedAssetsService;
        }

        [HttpGet("companies/{id}/ccdc")]
        public async Task<ActionResult<IEnumerable<CcdcDto>>> GetCcdc(int id, [FromQuery] int? month = 10, [FromQuery] int? year = 2026)
        {
            var ccdc = await _fixedAssetsService.GetCcdcListAsync(id, month, year);
            return Ok(new { success = true, data = ccdc });
        }

        [HttpPost("companies/{companyId}/ccdc")]
        public async Task<ActionResult> CreateCcdc(int companyId, [FromBody] CcdcDto ccdc)
        {
            ccdc.CompanyId = companyId;
            int newId = await _fixedAssetsService.CreateCcdcAsync(ccdc);
            return Ok(new { success = true, data = newId, message = "Đã thêm CCDC thành công." });
        }

        [HttpPut("ccdc/{ccdcId}")]
        public async Task<ActionResult> UpdateCcdc(int ccdcId, [FromBody] CcdcDto ccdc)
        {
            ccdc.Id = ccdcId;
            bool updated = await _fixedAssetsService.UpdateCcdcAsync(ccdc);
            if (!updated) return NotFound(new { success = false, message = "Không tìm thấy CCDC." });
            return Ok(new { success = true, message = "Đã cập nhật CCDC thành công." });
        }

        [HttpDelete("ccdc/{ccdcId}")]
        public async Task<ActionResult> DeleteCcdc(int ccdcId)
        {
            bool deleted = await _fixedAssetsService.DeleteCcdcAsync(ccdcId);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy CCDC." });
            return Ok(new { success = true, message = "Đã xóa CCDC thành công." });
        }
    }
}
