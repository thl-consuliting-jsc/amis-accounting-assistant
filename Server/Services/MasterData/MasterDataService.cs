using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.MasterData;
using AmisAssistant.Server.Services.SystemDomain;

namespace AmisAssistant.Server.Services.MasterData
{
    public class MasterDataService : IMasterDataService
    {
        private readonly ICompanyRepository _companyRepo;
        private readonly IBankAccountRepository _bankAccountRepo;
        private readonly IAccountingRuleRepository _ruleRepo;
        private readonly IPartnerRepository _partnerRepo;
        private readonly ISystemFileService _fileService;

        public MasterDataService(
            ICompanyRepository companyRepo,
            IBankAccountRepository bankAccountRepo,
            IAccountingRuleRepository ruleRepo,
            IPartnerRepository partnerRepo,
            ISystemFileService fileService)
        {
            _companyRepo = companyRepo;
            _bankAccountRepo = bankAccountRepo;
            _ruleRepo = ruleRepo;
            _partnerRepo = partnerRepo;
            _fileService = fileService;
        }

        // ==========================================
        // 1. COMPANIES CRUD
        // ==========================================
        public async Task<IEnumerable<CompanyDto>> GetCompaniesAsync()
        {
            try
            {
                var list = (await _companyRepo.GetAllAsync()).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetCompaniesAsync Error]: {ex.Message}");
            }

            return GetFallbackCompanies();
        }

        public async Task<CompanyDto?> GetCompanyByIdAsync(int id)
        {
            try
            {
                var comp = await _companyRepo.GetByIdAsync(id);
                if (comp != null) return comp;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetCompanyByIdAsync Error]: {ex.Message}");
            }

            var list = await GetCompaniesAsync();
            return list.FirstOrDefault(c => c.Id == id);
        }

        public async Task<int> SaveCompanyAsync(CompanyDto company)
        {
            if (company.TenantId <= 0) company.TenantId = 1;

            if (company.Id <= 0 && !string.IsNullOrWhiteSpace(company.TaxCode))
            {
                var existing = await _companyRepo.GetByTaxCodeAsync(company.TaxCode.Trim());
                if (existing != null)
                {
                    company.Id = existing.Id;
                    if (company.TenantId <= 0) company.TenantId = existing.TenantId > 0 ? existing.TenantId : 1;
                }
            }

            int companyId = company.Id;
            if (company.Id > 0)
            {
                await _companyRepo.UpdateAsync(company);
            }
            else
            {
                companyId = await _companyRepo.InsertAsync(company);
                company.Id = companyId;
            }

            await SyncCongTyJsonAsync();
            return companyId;
        }

        public async Task<bool> DeleteCompanyAsync(int id)
        {
            bool res = await _companyRepo.DeleteAsync(id);
            await SyncCongTyJsonAsync();
            return res;
        }

        private IEnumerable<CompanyDto> GetFallbackCompanies()
        {
            string root = _fileService.RootAppDir;
            return new List<CompanyDto>
            {
                new CompanyDto
                {
                    Id = 1,
                    TenantId = 1,
                    TaxCode = "0111154196",
                    CompanyName = "CÔNG TY CỔ PHẦN ZFUND",
                    DataFolder = root,
                    RulesPath = Path.Combine(root, "6. APP", "quy_tac.json"),
                    FiscalYear = 2026,
                    AutoFindPartner = true,
                    BankAccountCount = 2,
                    RuleCount = 15,
                    PartnerCount = 12
                },
                new CompanyDto
                {
                    Id = 2,
                    TenantId = 1,
                    TaxCode = "0110030367",
                    CompanyName = "CÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI",
                    DataFolder = root,
                    RulesPath = Path.Combine(root, "6. APP", "quy_tac.json"),
                    FiscalYear = 2026,
                    AutoFindPartner = true,
                    BankAccountCount = 1,
                    RuleCount = 0,
                    PartnerCount = 0
                }
            };
        }

        private async Task SyncCongTyJsonAsync()
        {
            try
            {
                var companies = (await GetCompaniesAsync()).ToList();
                string root = _fileService.RootAppDir;
                string jsonPath = Path.Combine(root, "6. APP", "cong_ty.json");
                if (companies.Count > 0)
                {
                    var items = companies.Select(c => new
                    {
                        ten = c.CompanyName,
                        mst = c.TaxCode,
                        thu_muc = string.IsNullOrEmpty(c.DataFolder) ? root : c.DataFolder,
                        quy_tac = string.IsNullOrEmpty(c.RulesPath) ? Path.Combine(root, "6. APP", "quy_tac.json") : c.RulesPath
                    }).ToList();

                    var payload = new
                    {
                        chon = 0,
                        danh_sach = items
                    };

                    string json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
                    await File.WriteAllTextAsync(jsonPath, json, System.Text.Encoding.UTF8);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SyncCongTyJsonAsync Error]: {ex.Message}");
            }
        }

        // ==========================================
        // 2. BANK ACCOUNTS CRUD
        // ==========================================
        public async Task<IEnumerable<BankAccountDto>> GetBankAccountsAsync(int companyId)
        {
            try
            {
                var list = (await _bankAccountRepo.GetByCompanyIdAsync(companyId)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetBankAccountsAsync Error]: {ex.Message}");
            }

            return new List<BankAccountDto>
            {
                new BankAccountDto { Id = 1, CompanyId = companyId, BankCode = "MB", BankName = "Ngân hàng TMCP Quân đội (MB)", AccountNumber = "19932568", AccountName = "MB Bank", GlAccount = "11212", InitialBalance = 8729184, CurrentBalance = 6663849, IsActive = true },
                new BankAccountDto { Id = 2, CompanyId = companyId, BankCode = "VPB", BankName = "Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)", AccountNumber = "011115419688", AccountName = "VPBank", GlAccount = "11211", InitialBalance = 2789136, CurrentBalance = 6638800, IsActive = true }
            };
        }

        public async Task<int> CreateBankAccountAsync(BankAccountDto account)
        {
            if (account.BankProfileId <= 0)
            {
                account.BankProfileId = account.BankCode.ToUpper().Contains("VP") ? 2 : (account.BankCode.ToUpper().Contains("TCB") ? 3 : 1);
            }
            return await _bankAccountRepo.InsertAsync(account);
        }

        public async Task<bool> UpdateBankAccountAsync(BankAccountDto account)
        {
            return await _bankAccountRepo.UpdateAsync(account);
        }

        public async Task<bool> DeleteBankAccountAsync(int accountId)
        {
            return await _bankAccountRepo.DeleteAsync(accountId);
        }

        // ==========================================
        // 3. ACCOUNTING RULES CRUD
        // ==========================================
        public async Task<IEnumerable<AccountingRuleDto>> GetAccountingRulesAsync(int companyId)
        {
            try
            {
                var list = (await _ruleRepo.GetByCompanyIdAsync(companyId)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetAccountingRulesAsync Error]: {ex.Message}");
            }

            return new List<AccountingRuleDto>
            {
                new AccountingRuleDto { Id = 1, CompanyId = companyId, Priority = 5, RuleName = "Thu tiền bán hàng KH", TransactionDirection = "IN", Keywords = "thanh toan don hang, ck tien hang, mua phan mem", DebitAccount = "1121", CreditAccount = "131", PartnerCode = "KH00001", DescriptionPattern = "Thu tiền khách hàng thanh toán", IsActive = true },
                new AccountingRuleDto { Id = 2, CompanyId = companyId, Priority = 10, RuleName = "Chi phí hạ tầng Cloud AWS", TransactionDirection = "OUT", Keywords = "AWS, AMAZON WEB SERVICES, CLOUD", DebitAccount = "6427", CreditAccount = "11211", PartnerCode = "AWS", DescriptionPattern = "Chi phí máy chủ đám mây AWS", IsActive = true }
            };
        }

        public async Task<int> CreateAccountingRuleAsync(AccountingRuleDto rule)
        {
            return await _ruleRepo.InsertAsync(rule);
        }

        public async Task<bool> UpdateAccountingRuleAsync(AccountingRuleDto rule)
        {
            return await _ruleRepo.UpdateAsync(rule);
        }

        public async Task<bool> DeleteAccountingRuleAsync(int ruleId)
        {
            return await _ruleRepo.DeleteAsync(ruleId);
        }

        // ==========================================
        // 4. PARTNERS (DANH MỤC ĐỐI TƯỢNG) CRUD
        // ==========================================
        public async Task<IEnumerable<PartnerDto>> GetPartnersAsync(int companyId, string? type = null, string? search = null)
        {
            try
            {
                var list = (await _partnerRepo.GetByCompanyIdAsync(companyId, type, search)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetPartnersAsync Error]: {ex.Message}");
            }

            return new List<PartnerDto>
            {
                new PartnerDto { Id = 1, CompanyId = companyId, PartnerCode = "KH00001", PartnerName = "Công ty CP Giải pháp Công nghệ FPT", TaxCode = "0101248141", PartnerType = "KH" },
                new PartnerDto { Id = 2, CompanyId = companyId, PartnerCode = "NCC00016", PartnerName = "Amazon Web Services, Inc.", TaxCode = "9999999999", PartnerType = "NCC", DefaultDebitAccount = "6427" }
            };
        }

        public async Task<int> CreatePartnerAsync(PartnerDto partner)
        {
            if (string.IsNullOrEmpty(partner.NormalizedName))
            {
                partner.NormalizedName = partner.PartnerName;
            }
            return await _partnerRepo.InsertAsync(partner);
        }

        public async Task<bool> UpdatePartnerAsync(PartnerDto partner)
        {
            if (string.IsNullOrEmpty(partner.NormalizedName))
            {
                partner.NormalizedName = partner.PartnerName;
            }
            return await _partnerRepo.UpdateAsync(partner);
        }

        public async Task<bool> DeletePartnerAsync(int partnerId)
        {
            return await _partnerRepo.DeleteAsync(partnerId);
        }
    }
}
