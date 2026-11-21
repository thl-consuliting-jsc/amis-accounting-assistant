using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.FixedAssets
{
    public interface ICcdcRepository : IBaseRepository<CcdcDto, int>
    {
        Task<IEnumerable<CcdcDto>> GetByCompanyIdAsync(int companyId, int? month = null, int? year = null);
    }
}
