using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public interface ICompanyRepository : IBaseRepository<CompanyDto, int>
    {
        Task<CompanyDto?> GetByTaxCodeAsync(string taxCode);
    }
}
