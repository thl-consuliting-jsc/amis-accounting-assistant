using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.CustomerPortal
{
    public interface ICustomerPortalService
    {
        Task<IEnumerable<CustomerDebtDto>> GetCustomerDebtsAsync(int companyId);
        Task<IEnumerable<InventoryItemDto>> GetInventoryItemsAsync(int companyId);
        Task<CustomerQueryResponse> ProcessCustomerQueryAsync(CustomerQueryRequest request);
    }
}
