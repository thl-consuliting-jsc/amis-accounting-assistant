using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.Invoicing
{
    public interface IInvoiceRepository : IBaseRepository<InvoiceDto, int>
    {
        Task<IEnumerable<InvoiceDto>> GetByCompanyIdAsync(int companyId, string? type = null, int? month = null, int? year = null);
    }
}
