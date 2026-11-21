using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.MasterData;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.MasterData
{
    [ApiController]
    [Route("api/accounting")]
    public class CompaniesController : ControllerBase
    {
        private readonly IMasterDataService _masterDataService;

        public CompaniesController(IMasterDataService masterDataService)
        {
            _masterDataService = masterDataService;
        }

        [HttpGet("companies")]
        public async Task<ActionResult<IEnumerable<CompanyDto>>> GetCompanies()
        {
            var result = await _masterDataService.GetCompaniesAsync();
            return Ok(new { success = true, data = result });
        }

        [HttpGet("companies/{id}")]
        public async Task<ActionResult<CompanyDto>> GetCompany(int id)
        {
            var company = await _masterDataService.GetCompanyByIdAsync(id);
            if (company == null) return NotFound(new { success = false, message = "Không tìm thấy công ty" });
            return Ok(new { success = true, data = company });
        }

        [HttpPost("companies")]
        public async Task<ActionResult> SaveCompany([FromBody] CompanyDto company)
        {
            int id = await _masterDataService.SaveCompanyAsync(company);
            return Ok(new { success = true, data = id, message = "Đã lưu thông tin công ty thành công." });
        }

        [HttpPut("companies/{id}")]
        public async Task<ActionResult> UpdateCompany(int id, [FromBody] CompanyDto company)
        {
            company.Id = id;
            await _masterDataService.SaveCompanyAsync(company);
            return Ok(new { success = true, message = "Đã cập nhật công ty thành công." });
        }

        [HttpDelete("companies/{id}")]
        public async Task<ActionResult> DeleteCompany(int id)
        {
            bool deleted = await _masterDataService.DeleteCompanyAsync(id);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy công ty để xóa." });
            return Ok(new { success = true, message = "Đã xóa công ty thành công." });
        }
    }
}
