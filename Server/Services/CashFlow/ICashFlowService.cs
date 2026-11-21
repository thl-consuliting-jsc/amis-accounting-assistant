using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.CashFlow
{
    public interface ICashFlowService
    {
        Task<IEnumerable<CashFlowPlanDto>> GetCashFlowPlansAsync(int companyId, int month, int year);
        Task<CashFlowPlanDto> SaveCashFlowPlanAsync(CashFlowPlanDto dto);
        Task<bool> DeleteCashFlowPlanAsync(int id);
        Task<CashFlowPlanDto?> ApproveCashFlowPlanAsync(int id, ApproveCashFlowRequest request);
    }
}
