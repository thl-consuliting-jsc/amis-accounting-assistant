using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.Banking
{
    public interface IBankTransactionRepository : IBaseRepository<BankTransactionDto, int>
    {
        Task<IEnumerable<BankTransactionDto>> GetByCompanyIdAsync(int companyId, int? batchId = null, string? status = null);
    }
}
