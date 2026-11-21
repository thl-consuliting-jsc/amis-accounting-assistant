using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public interface IAccountingRuleRepository : IBaseRepository<AccountingRuleDto, int>
    {
        Task<IEnumerable<AccountingRuleDto>> GetByCompanyIdAsync(int companyId);
    }
}
