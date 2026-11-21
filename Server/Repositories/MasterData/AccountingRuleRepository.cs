using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public class AccountingRuleRepository : BaseRepository<AccountingRuleDto, int>, IAccountingRuleRepository
    {
        public AccountingRuleRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "AccountingRules";

        public async Task<IEnumerable<AccountingRuleDto>> GetByCompanyIdAsync(int companyId)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT Id, CompanyId, Priority, RuleName, TransactionDirection, Keywords,
                       ExcludeKeywords, PartnerKeywords, PartnerCode, PartnerName,
                       DebitAccount, CreditAccount, DescriptionPattern, IsInternalTransfer,
                       IsCardPayment, IsCcdc, RuleType, Note, IsActive
                FROM AccountingRules
                WHERE CompanyId = @CompanyId
                ORDER BY Priority ASC, Id ASC;";
            return await conn.QueryAsync<AccountingRuleDto>(sql, new { CompanyId = companyId });
        }
    }
}
