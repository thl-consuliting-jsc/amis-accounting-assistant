using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.CashFlow;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.CashFlow
{
    [ApiController]
    [Route("api/accounting")]
    public class CashFlowController : ControllerBase
    {
        private readonly ICashFlowService _cashFlowService;

        public CashFlowController(ICashFlowService cashFlowService)
        {
            _cashFlowService = cashFlowService;
        }

        [HttpGet("companies/{id}/cashflow")]
        public async Task<ActionResult> GetCashFlowPlans(int id, [FromQuery] int month = 10, [FromQuery] int year = 2026)
        {
            var plans = await _cashFlowService.GetCashFlowPlansAsync(id, month, year);
            return Ok(new { success = true, data = plans });
        }

        [HttpPost("companies/{id}/cashflow")]
        public async Task<ActionResult> SaveCashFlowPlan(int id, [FromBody] CashFlowPlanDto dto)
        {
            dto.CompanyId = id;
            var saved = await _cashFlowService.SaveCashFlowPlanAsync(dto);
            return Ok(new { success = true, data = saved, message = "Đã lưu khoản dự kiến thu chi!" });
        }

        [HttpDelete("cashflow/{id}")]
        public async Task<ActionResult> DeleteCashFlowPlan(int id)
        {
            bool ok = await _cashFlowService.DeleteCashFlowPlanAsync(id);
            return Ok(new { success = ok, message = ok ? "Đã xóa khoản dự thu chi." : "Không tìm thấy khoản này." });
        }

        [HttpPost("cashflow/{id}/approve")]
        public async Task<ActionResult> ApproveCashFlowPlan(int id, [FromBody] ApproveCashFlowRequest request)
        {
            var res = await _cashFlowService.ApproveCashFlowPlanAsync(id, request);
            if (res == null) return NotFound(new { success = false, message = "Không tìm thấy khoản dự chi." });

            return Ok(new
            {
                success = true,
                data = res,
                message = request.Status == "Approved" 
                    ? (request.AutoGenerateContract ? "Đã duyệt chi và tự động sinh Hợp đồng/Hồ sơ tương ứng!" : "Đã phê duyệt khoản chi thành công!")
                    : "Đã từ chối khoản chi."
            });
        }
    }
}
