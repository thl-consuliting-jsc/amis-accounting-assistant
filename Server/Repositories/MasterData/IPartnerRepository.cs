using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public interface IPartnerRepository : IBaseRepository<PartnerDto, int>
    {
        Task<IEnumerable<PartnerDto>> GetByCompanyIdAsync(int companyId, string? type = null, string? search = null);
    }
}
