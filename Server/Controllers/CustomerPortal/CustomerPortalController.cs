using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.CustomerPortal;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.CustomerPortal
{
    [ApiController]
    [Route("api/accounting")]
    public class CustomerPortalController : ControllerBase
    {
        private readonly ICustomerPortalService _customerPortalService;

        public CustomerPortalController(ICustomerPortalService customerPortalService)
        {
            _customerPortalService = customerPortalService;
        }

        [HttpGet("companies/{id}/customer-debts")]
        public async Task<ActionResult> GetCustomerDebts(int id)
        {
            var debts = await _customerPortalService.GetCustomerDebtsAsync(id);
            return Ok(new { success = true, data = debts });
        }

        [HttpGet("companies/{id}/inventory")]
        public async Task<ActionResult> GetInventory(int id)
        {
            var inventory = await _customerPortalService.GetInventoryItemsAsync(id);
            return Ok(new { success = true, data = inventory });
        }

        [HttpPost("customer-query")]
        public async Task<ActionResult> ProcessCustomerQuery([FromBody] CustomerQueryRequest request)
        {
            var response = await _customerPortalService.ProcessCustomerQueryAsync(request);
            return Ok(new { success = true, data = response });
        }
    }
}
