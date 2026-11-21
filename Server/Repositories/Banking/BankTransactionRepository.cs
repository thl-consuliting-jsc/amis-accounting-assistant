using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.Banking
{
    public class BankTransactionRepository : BaseRepository<BankTransactionDto, int>, IBankTransactionRepository
    {
        public BankTransactionRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "BankTransactions";
        protected override IEnumerable<string> IgnoredProperties => new[] { "BankName", "AccountNumber" };

        public async Task<IEnumerable<BankTransactionDto>> GetByCompanyIdAsync(int companyId, int? batchId = null, string? status = null)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT bt.Id, bt.BatchId, bt.BankAccountId, bp.BankName, ba.AccountNumber,
                       bt.TransactionDate, bt.RefNo, bt.Amount, bt.Direction, bt.Description,
                       bt.PartnerNameRaw, bt.BalanceAfter, bt.DebitAccount, bt.CreditAccount,
                       bt.PartnerCode, bt.PartnerName, bt.FinalDescription, bt.VoucherNo,
                       bt.VoucherType, bt.Status, bt.Notes
                FROM BankTransactions bt
                INNER JOIN BankAccounts ba ON bt.BankAccountId = ba.Id
                INNER JOIN BankProfiles bp ON ba.BankProfileId = bp.Id
                LEFT JOIN BatchImports bi ON bt.BatchId = bi.Id
                WHERE ba.CompanyId = @CompanyId
                  AND (@BatchId IS NULL OR bt.BatchId = @BatchId)
                  AND (@Status IS NULL OR bt.Status = @Status)
                ORDER BY bt.TransactionDate DESC, bt.Id DESC;";
            return await conn.QueryAsync<BankTransactionDto>(sql, new { CompanyId = companyId, BatchId = batchId, Status = status });
        }
    }
}
