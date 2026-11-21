using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.EngineDomain
{
    public interface IEngineService
    {
        Task<ReconciliationDto?> GetLatestReconciliationAsync(int companyId);
        Task<IEnumerable<GeneratedFileDto>> GetGeneratedFilesAsync(int companyId, int month, int year, string? overrideBaseDir = null);
        Task<string> GetLatestLogAsync(int companyId, int month, int year);
        Task<RunEngineResultDto> RunEngineAsync(int companyId, int month, int year, string? overrideBaseDir = null);
    }
}
