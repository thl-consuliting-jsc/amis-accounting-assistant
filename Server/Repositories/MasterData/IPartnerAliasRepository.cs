using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public interface IPartnerAliasRepository : IBaseRepository<PartnerAliasDto, int>
    {
        Task<bool> UpsertAliasAsync(int companyId, string rawName, string partnerCode, string? note);
    }
}
