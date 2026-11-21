using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.MasterData;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.MasterData
{
    [ApiController]
    [Route("api/accounting")]
    public class AccountingRulesController : ControllerBase
    {
        private readonly IMasterDataService _masterDataService;

        public AccountingRulesController(IMasterDataService masterDataService)
        {
            _masterDataService = masterDataService;
        }

        [HttpGet("companies/{id}/rules")]
        public async Task<ActionResult<IEnumerable<AccountingRuleDto>>> GetRules(int id)
        {
            var rules = await _masterDataService.GetAccountingRulesAsync(id);
            return Ok(new { success = true, data = rules });
        }

        [HttpPost("companies/{id}/rules")]
        public async Task<ActionResult> CreateRule(int id, [FromBody] AccountingRuleDto rule)
        {
            rule.CompanyId = id;
            int newId = await _masterDataService.CreateAccountingRuleAsync(rule);
            return Ok(new { success = true, data = newId, message = "Quy tắc hạch toán đã được thêm thành công." });
        }

        [HttpPut("rules/{ruleId}")]
        public async Task<ActionResult> UpdateRule(int ruleId, [FromBody] AccountingRuleDto rule)
        {
            rule.Id = ruleId;
            bool updated = await _masterDataService.UpdateAccountingRuleAsync(rule);
            if (!updated) return NotFound(new { success = false, message = "Rule not found" });
            return Ok(new { success = true, message = "Quy tắc đã được cập nhật thành công." });
        }

        [HttpDelete("rules/{ruleId}")]
        public async Task<ActionResult> DeleteRule(int ruleId)
        {
            bool deleted = await _masterDataService.DeleteAccountingRuleAsync(ruleId);
            if (!deleted) return NotFound(new { success = false, message = "Rule not found" });
            return Ok(new { success = true, message = "Quy tắc đã được xóa thành công." });
        }
    }
}
