using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.Banking
{
    public interface IBankingService
    {
        Task<IEnumerable<BankTransactionDto>> GetTransactionsAsync(int companyId, int? batchId = null, string? status = null);
        Task<int> CreateTransactionAsync(BankTransactionDto tx);
        Task<bool> UpdateTransactionAsync(BankTransactionDto tx);
        Task<bool> DeleteTransactionAsync(int txId);
    }
}
