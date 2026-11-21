using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.MasterData;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.MasterData
{
    [ApiController]
    [Route("api/accounting")]
    public class PartnersController : ControllerBase
    {
        private readonly IMasterDataService _masterDataService;

        public PartnersController(IMasterDataService masterDataService)
        {
            _masterDataService = masterDataService;
        }

        [HttpGet("companies/{id}/partners")]
        public async Task<ActionResult<IEnumerable<PartnerDto>>> GetPartners(int id, [FromQuery] string? type = null, [FromQuery] string? search = null)
        {
            var partners = await _masterDataService.GetPartnersAsync(id, type, search);
            return Ok(new { success = true, data = partners });
        }

        [HttpPost("companies/{companyId}/partners")]
        public async Task<ActionResult> CreatePartner(int companyId, [FromBody] PartnerDto partner)
        {
            partner.CompanyId = companyId;
            int newId = await _masterDataService.CreatePartnerAsync(partner);
            return Ok(new { success = true, data = newId, message = "Đã thêm đối tượng thành công." });
        }

        [HttpPut("partners/{partnerId}")]
        public async Task<ActionResult> UpdatePartner(int partnerId, [FromBody] PartnerDto partner)
        {
            partner.Id = partnerId;
            bool updated = await _masterDataService.UpdatePartnerAsync(partner);
            if (!updated) return NotFound(new { success = false, message = "Không tìm thấy đối tượng." });
            return Ok(new { success = true, message = "Đã cập nhật đối tượng thành công." });
        }

        [HttpDelete("partners/{partnerId}")]
        public async Task<ActionResult> DeletePartner(int partnerId)
        {
            bool deleted = await _masterDataService.DeletePartnerAsync(partnerId);
            if (!deleted) return NotFound(new { success = false, message = "Không tìm thấy đối tượng." });
            return Ok(new { success = true, message = "Đã xóa đối tượng thành công." });
        }
    }
}
