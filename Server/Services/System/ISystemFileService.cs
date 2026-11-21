using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.SystemDomain
{
    public interface ISystemFileService
    {
        Task<bool> SaveAliasAsync(int companyId, string rawName, string partnerCode, string? note);
        Task<string> GetResultsFolderPathAsync(int companyId, int month, int year, string? overrideBaseDir = null);
        Task<string?> GetFilePathAsync(int companyId, string fileName, int month, int year);
        Task<string?> GetNoteFilePathAsync(int companyId, int month, int year);
        Task<byte[]?> GetResultsZipAsync(int companyId, int month, int year, string? overrideBaseDir = null);
        string RootAppDir { get; }
        string GetCompanyBaseDir(CompanyDto? comp);
    }
}
