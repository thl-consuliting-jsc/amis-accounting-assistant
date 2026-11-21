using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.FixedAssets
{
    public interface IFixedAssetsService
    {
        Task<IEnumerable<CcdcDto>> GetCcdcListAsync(int companyId, int? month = null, int? year = null);
        Task<int> CreateCcdcAsync(CcdcDto ccdc);
        Task<bool> UpdateCcdcAsync(CcdcDto ccdc);
        Task<bool> DeleteCcdcAsync(int ccdcId);
    }
}
