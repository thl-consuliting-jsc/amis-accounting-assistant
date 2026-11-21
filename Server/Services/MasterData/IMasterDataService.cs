using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.MasterData
{
    public interface IMasterDataService
    {
        Task<IEnumerable<CompanyDto>> GetCompaniesAsync();
        Task<CompanyDto?> GetCompanyByIdAsync(int id);
        Task<int> SaveCompanyAsync(CompanyDto company);
        Task<bool> DeleteCompanyAsync(int id);

        Task<IEnumerable<BankAccountDto>> GetBankAccountsAsync(int companyId);
        Task<int> CreateBankAccountAsync(BankAccountDto account);
        Task<bool> UpdateBankAccountAsync(BankAccountDto account);
        Task<bool> DeleteBankAccountAsync(int accountId);

        Task<IEnumerable<AccountingRuleDto>> GetAccountingRulesAsync(int companyId);
        Task<int> CreateAccountingRuleAsync(AccountingRuleDto rule);
        Task<bool> UpdateAccountingRuleAsync(AccountingRuleDto rule);
        Task<bool> DeleteAccountingRuleAsync(int ruleId);

        Task<IEnumerable<PartnerDto>> GetPartnersAsync(int companyId, string? type = null, string? search = null);
        Task<int> CreatePartnerAsync(PartnerDto partner);
        Task<bool> UpdatePartnerAsync(PartnerDto partner);
        Task<bool> DeletePartnerAsync(int partnerId);
    }
}
