using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public interface IBankAccountRepository : IBaseRepository<BankAccountDto, int>
    {
        Task<IEnumerable<BankAccountDto>> GetByCompanyIdAsync(int companyId);
    }
}
