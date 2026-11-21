using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.Taxation;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.Taxation
{
    [ApiController]
    [Route("api/accounting")]
    public class VatReportController : ControllerBase
    {
        private readonly ITaxationService _taxationService;

        public VatReportController(ITaxationService taxationService)
        {
            _taxationService = taxationService;
        }

        [HttpGet("companies/{id}/vat-report")]
        public async Task<ActionResult<IEnumerable<VatIndicatorDto>>> GetVatReport(int id, [FromQuery] int month = 10, [FromQuery] int year = 2026)
        {
            var vat = await _taxationService.GetVatIndicatorsAsync(id, month, year);
            return Ok(new { success = true, data = vat });
        }
    }
}
