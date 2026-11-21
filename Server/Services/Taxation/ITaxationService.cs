using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.Taxation
{
    public interface ITaxationService
    {
        Task<IEnumerable<VatIndicatorDto>> GetVatIndicatorsAsync(int companyId, int month, int year);
    }
}
