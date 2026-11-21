using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public class CompanyRepository : BaseRepository<CompanyDto, int>, ICompanyRepository
    {
        public CompanyRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "Companies";
        protected override IEnumerable<string> IgnoredProperties => new[] { "BankAccountCount", "RuleCount", "PartnerCount" };

        public override async Task<IEnumerable<CompanyDto>> GetAllAsync()
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT c.Id, c.TenantId, c.TaxCode, c.CompanyName, c.CompanyAddress, c.DataFolder, c.RulesPath, c.FiscalYear, c.AutoFindPartner,
                       (SELECT COUNT(*) FROM BankAccounts ba WHERE ba.CompanyId = c.Id) AS BankAccountCount,
                       (SELECT COUNT(*) FROM AccountingRules ar WHERE ar.CompanyId = c.Id) AS RuleCount,
                       (SELECT COUNT(*) FROM Partners p WHERE p.CompanyId = c.Id) AS PartnerCount
                FROM Companies c
                ORDER BY c.Id;";
            return await conn.QueryAsync<CompanyDto>(sql);
        }

        public override async Task<CompanyDto?> GetByIdAsync(int id)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT c.Id, c.TenantId, c.TaxCode, c.CompanyName, c.CompanyAddress, c.DataFolder, c.RulesPath, c.FiscalYear, c.AutoFindPartner,
                       (SELECT COUNT(*) FROM BankAccounts ba WHERE ba.CompanyId = c.Id) AS BankAccountCount,
                       (SELECT COUNT(*) FROM AccountingRules ar WHERE ar.CompanyId = c.Id) AS RuleCount,
                       (SELECT COUNT(*) FROM Partners p WHERE p.CompanyId = c.Id) AS PartnerCount
                FROM Companies c
                WHERE c.Id = @Id;";
            return await conn.QueryFirstOrDefaultAsync<CompanyDto>(sql, new { Id = id });
        }

        public async Task<CompanyDto?> GetByTaxCodeAsync(string taxCode)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT c.Id, c.TenantId, c.TaxCode, c.CompanyName, c.CompanyAddress, c.DataFolder, c.RulesPath, c.FiscalYear, c.AutoFindPartner,
                       (SELECT COUNT(*) FROM BankAccounts ba WHERE ba.CompanyId = c.Id) AS BankAccountCount,
                       (SELECT COUNT(*) FROM AccountingRules ar WHERE ar.CompanyId = c.Id) AS RuleCount,
                       (SELECT COUNT(*) FROM Partners p WHERE p.CompanyId = c.Id) AS PartnerCount
                FROM Companies c
                WHERE c.TaxCode = @TaxCode;";
            return await conn.QueryFirstOrDefaultAsync<CompanyDto>(sql, new { TaxCode = taxCode });
        }
    }
}
