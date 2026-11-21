using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.Contracts
{
    public interface IContractsService
    {
        Task<IEnumerable<ContractTemplateDto>> GetContractTemplatesAsync();
        Task<IEnumerable<ContractDocumentDto>> GetContractsAsync(int companyId);
        Task<ContractDocumentDto> GenerateContractAsync(GenerateContractRequest request);
        Task<bool> DeleteContractAsync(int contractId);
        Task<(byte[] Bytes, string ContentType, string FileName)?> ExportContractDocumentAsync(int contractId);
    }
}
