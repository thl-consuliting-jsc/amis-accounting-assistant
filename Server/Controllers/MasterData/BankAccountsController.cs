using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.MasterData;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.MasterData
{
    [ApiController]
    [Route("api/accounting")]
    public class BankAccountsController : ControllerBase
    {
        private readonly IMasterDataService _masterDataService;

        public BankAccountsController(IMasterDataService masterDataService)
        {
            _masterDataService = masterDataService;
        }

        [HttpGet("companies/{companyId}/bank-accounts")]
        public async Task<ActionResult<IEnumerable<BankAccountDto>>> GetBankAccounts(int companyId)
        {
            var accounts = await _masterDataService.GetBankAccountsAsync(companyId);
            return Ok(new { success = true, data = accounts });
        }

        [HttpPost("companies/{companyId}/bank-accounts")]
        public async Task<ActionResult> CreateBankAccount(int companyId, [FromBody] BankAccountDto account)
        {
            account.CompanyId = companyId;
            int newId = await _masterDataService.CreateBankAccountAsync(account);
            return Ok(new { success = true, data = newId, message = "Đã thêm tài khoản ngân hàng thành công." });
        }

        [HttpPut("bank-accounts/{accountId}")]
        public async Task<ActionResult> UpdateBankAccount(int accountId, [FromBody] BankAccountDto account)
        {
            account.Id = accountId;
            bool updated = await _masterDataService.UpdateBankAccountAsync(account);
            if (!updated) return NotFound(new { success = false, message = "Không tìm thấy tài khoản ngân hàng." });
            return Ok(new { success = true, message = "Đã cập nhật tài khoản ngân hàng thành công." });
        }

        [HttpDelete("bank-accounts/{accountId}")]
        public async Task<ActionResult> DeleteBankAccount(int accountId)
        {
            bool deleted = await _masterDataService.DeleteBankAccountAsync(accountId);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy tài khoản ngân hàng." });
            return Ok(new { success = true, message = "Đã xóa tài khoản ngân hàng thành công." });
        }
    }
}
