using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.Invoicing;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Invoicing
{
    [ApiController]
    [Route("api/accounting")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoicingService _invoicingService;

        public InvoicesController(IInvoicingService invoicingService)
        {
            _invoicingService = invoicingService;
        }

        [HttpGet("companies/{id}/invoices")]
        public async Task<ActionResult<IEnumerable<InvoiceDto>>> GetInvoices(int id, [FromQuery] string? type = "IN", [FromQuery] int? month = 10, [FromQuery] int? year = 2026)
        {
            var invoices = await _invoicingService.GetInvoicesAsync(id, type, month, year);
            return Ok(new { success = true, data = invoices });
        }

        [HttpGet("companies/{id}/invoices/download-pdf")]
        public async Task<IActionResult> DownloadInvoicePdf(int id, [FromQuery] string fileName, [FromQuery] string? type = "IN", [FromQuery] int month = 10, [FromQuery] int year = 2026)
        {
            if (string.IsNullOrWhiteSpace(fileName)) return BadRequest("Tên tệp không hợp lệ");
            var pdfPath = await _invoicingService.GetInvoicePdfPathAsync(id, fileName, type, month, year);
            if (string.IsNullOrEmpty(pdfPath) || !System.IO.File.Exists(pdfPath))
            {
                return NotFound(new { success = false, message = "Không tìm thấy tệp PDF của hóa đơn này trên ổ đĩa." });
            }

            var stream = System.IO.File.OpenRead(pdfPath);
            return base.File(stream, "application/pdf", Path.GetFileName(pdfPath));
        }

        [HttpPost("companies/{companyId}/invoices")]
        public async Task<ActionResult> CreateInvoice(int companyId, [FromBody] InvoiceDto invoice)
        {
            invoice.CompanyId = companyId;
            int newId = await _invoicingService.CreateInvoiceAsync(invoice);
            return Ok(new { success = true, data = newId, message = "Đã thêm hóa đơn thành công." });
        }

        [HttpPut("invoices/{invoiceId}")]
        public async Task<ActionResult> UpdateInvoice(int invoiceId, [FromBody] InvoiceDto invoice)
        {
            invoice.Id = invoiceId;
            bool updated = await _invoicingService.UpdateInvoiceAsync(invoice);
            if (!updated) return NotFound(new { success = false, message = "Không tìm thấy hóa đơn." });
            return Ok(new { success = true, message = "Đã cập nhật hóa đơn thành công." });
        }

        [HttpDelete("invoices/{invoiceId}")]
        public async Task<ActionResult> DeleteInvoice(int invoiceId)
        {
            bool deleted = await _invoicingService.DeleteInvoiceAsync(invoiceId);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy hóa đơn." });
            return Ok(new { success = true, message = "Đã xóa hóa đơn thành công." });
        }
    }
}
