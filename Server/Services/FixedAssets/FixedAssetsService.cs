using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.FixedAssets;

namespace AmisAssistant.Server.Services.FixedAssets
{
    public class FixedAssetsService : IFixedAssetsService
    {
        private readonly ICcdcRepository _ccdcRepo;

        public FixedAssetsService(ICcdcRepository ccdcRepo)
        {
            _ccdcRepo = ccdcRepo;
        }

        public async Task<IEnumerable<CcdcDto>> GetCcdcListAsync(int companyId, int? month = null, int? year = null)
        {
            try
            {
                var list = (await _ccdcRepo.GetByCompanyIdAsync(companyId, month, year)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetCcdcListAsync Error]: {ex.Message}");
            }

            return new List<CcdcDto>();
        }

        public async Task<int> CreateCcdcAsync(CcdcDto ccdc)
        {
            return await _ccdcRepo.InsertAsync(ccdc);
        }

        public async Task<bool> UpdateCcdcAsync(CcdcDto ccdc)
        {
            return await _ccdcRepo.UpdateAsync(ccdc);
        }

        public async Task<bool> DeleteCcdcAsync(int ccdcId)
        {
            return await _ccdcRepo.DeleteAsync(ccdcId);
        }
    }
}
