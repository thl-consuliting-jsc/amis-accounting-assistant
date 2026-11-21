using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.Contracts;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Contracts
{
    [ApiController]
    [Route("api/accounting")]
    public class ContractsController : ControllerBase
    {
        private readonly IContractsService _contractsService;

        public ContractsController(IContractsService contractsService)
        {
            _contractsService = contractsService;
        }

        [HttpGet("contracts/templates")]
        public async Task<ActionResult> GetContractTemplates()
        {
            var templates = await _contractsService.GetContractTemplatesAsync();
            return Ok(new { success = true, data = templates });
        }

        [HttpGet("companies/{id}/contracts")]
        public async Task<ActionResult> GetContracts(int id)
        {
            var contracts = await _contractsService.GetContractsAsync(id);
            return Ok(new { success = true, data = contracts });
        }

        [HttpPost("contracts/generate")]
        public async Task<ActionResult> GenerateContract([FromBody] GenerateContractRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PartnerName))
            {
                return BadRequest(new { success = false, message = "Vui lòng nhập tên đối tác / bên B." });
            }

            var doc = await _contractsService.GenerateContractAsync(request);
            return Ok(new { success = true, data = doc, message = "Đã sinh văn bản / hợp đồng thành công!" });
        }

        [HttpDelete("contracts/{contractId}")]
        public async Task<ActionResult> DeleteContract(int contractId)
        {
            bool ok = await _contractsService.DeleteContractAsync(contractId);
            return Ok(new { success = ok, message = ok ? "Đã xóa hợp đồng." : "Không tìm thấy hợp đồng." });
        }

        [HttpGet("contracts/{contractId}/download")]
        public async Task<IActionResult> DownloadContract(int contractId)
        {
            var result = await _contractsService.ExportContractDocumentAsync(contractId);
            if (result == null) return NotFound(new { success = false, message = "Không tìm thấy tài liệu hợp đồng." });

            return File(result.Value.Bytes, result.Value.ContentType, result.Value.FileName);
        }
    }
}
