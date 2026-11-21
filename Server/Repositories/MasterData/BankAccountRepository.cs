using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.MasterData
{
    public class BankAccountRepository : BaseRepository<BankAccountDto, int>, IBankAccountRepository
    {
        public BankAccountRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "BankAccounts";
        protected override IEnumerable<string> IgnoredProperties => new[] { "BankName", "BankCode" };

        public async Task<IEnumerable<BankAccountDto>> GetByCompanyIdAsync(int companyId)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT ba.Id, ba.CompanyId, ba.BankProfileId, bp.BankName, bp.BankCode,
                       ba.AccountNumber, ba.AccountName, ba.GlAccount,
                       ba.VoucherPrefixReceipt, ba.VoucherPrefixPayment,
                       ba.InitialBalance, ba.CurrentBalance, ba.IsActive
                FROM BankAccounts ba
                INNER JOIN BankProfiles bp ON ba.BankProfileId = bp.Id
                WHERE ba.CompanyId = @CompanyId
                ORDER BY ba.Id ASC;";
            return await conn.QueryAsync<BankAccountDto>(sql, new { CompanyId = companyId });
        }
    }
}
