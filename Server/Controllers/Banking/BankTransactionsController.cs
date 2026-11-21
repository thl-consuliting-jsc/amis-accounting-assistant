using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.Banking;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Banking
{
    [ApiController]
    [Route("api/accounting")]
    public class BankTransactionsController : ControllerBase
    {
        private readonly IBankingService _bankingService;

        public BankTransactionsController(IBankingService bankingService)
        {
            _bankingService = bankingService;
        }

        [HttpGet("companies/{id}/transactions")]
        public async Task<ActionResult<IEnumerable<BankTransactionDto>>> GetTransactions(int id, [FromQuery] int? batchId, [FromQuery] string? status)
        {
            var transactions = await _bankingService.GetTransactionsAsync(id, batchId, status);
            return Ok(new { success = true, data = transactions });
        }

        [HttpPost("companies/{companyId}/transactions")]
        public async Task<ActionResult> CreateTransaction(int companyId, [FromBody] BankTransactionDto tx)
        {
            int newId = await _bankingService.CreateTransactionAsync(tx);
            return Ok(new { success = true, data = newId, message = "Đã thêm giao dịch thành công." });
        }

        [HttpPut("transactions/{txId}")]
        public async Task<ActionResult> UpdateTransaction(int txId, [FromBody] BankTransactionDto tx)
        {
            tx.Id = txId;
            bool updated = await _bankingService.UpdateTransactionAsync(tx);
            if (!updated) return NotFound(new { success = false, message = "Không tìm thấy giao dịch." });
            return Ok(new { success = true, message = "Đã cập nhật giao dịch thành công." });
        }

        [HttpDelete("transactions/{txId}")]
        public async Task<ActionResult> DeleteTransaction(int txId)
        {
            bool deleted = await _bankingService.DeleteTransactionAsync(txId);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy giao dịch." });
            return Ok(new { success = true, message = "Đã xóa giao dịch thành công." });
        }
    }
}
