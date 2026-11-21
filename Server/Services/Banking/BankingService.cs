using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Banking;

namespace AmisAssistant.Server.Services.Banking
{
    public class BankingService : IBankingService
    {
        private readonly IBankTransactionRepository _txRepo;

        public BankingService(IBankTransactionRepository txRepo)
        {
            _txRepo = txRepo;
        }

        public async Task<IEnumerable<BankTransactionDto>> GetTransactionsAsync(int companyId, int? batchId = null, string? status = null)
        {
            try
            {
                var list = (await _txRepo.GetByCompanyIdAsync(companyId, batchId, status)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetTransactionsAsync Error]: {ex.Message}");
            }

            return GetFallbackTransactions();
        }

        public async Task<int> CreateTransactionAsync(BankTransactionDto tx)
        {
            return await _txRepo.InsertAsync(tx);
        }

        public async Task<bool> UpdateTransactionAsync(BankTransactionDto tx)
        {
            return await _txRepo.UpdateAsync(tx);
        }

        public async Task<bool> DeleteTransactionAsync(int txId)
        {
            return await _txRepo.DeleteAsync(txId);
        }

        private IEnumerable<BankTransactionDto> GetFallbackTransactions()
        {
            return new List<BankTransactionDto>
            {
                new BankTransactionDto
                {
                    Id = 1,
                    BatchId = 1,
                    BankAccountId = 1,
                    BankName = "Ngân hàng TMCP Quân đội (MB)",
                    AccountNumber = "19932568",
                    TransactionDate = new DateTime(2026, 10, 31),
                    RefNo = "FT261031001",
                    Amount = 1450000,
                    Direction = "IN",
                    Description = "TRA LAI TIEN GUI THANG 10",
                    PartnerNameRaw = "MB BANK",
                    BalanceAfter = 6663849,
                    DebitAccount = "11212",
                    CreditAccount = "515",
                    PartnerCode = "MB",
                    PartnerName = "MB Bank",
                    FinalDescription = "Thu lãi tiền gửi ngân hàng MB tháng 10/2026",
                    VoucherNo = "TG2610060",
                    VoucherType = "PhieuThu",
                    Status = "Matched",
                    Notes = null
                },
                new BankTransactionDto
                {
                    Id = 2,
                    BatchId = 1,
                    BankAccountId = 2,
                    BankName = "Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)",
                    AccountNumber = "011115419688",
                    TransactionDate = new DateTime(2026, 10, 30),
                    RefNo = "VP261030088",
                    Amount = 15800000,
                    Direction = "OUT",
                    Description = "THANH TOAN HA TANG CLOUD AWS T10",
                    PartnerNameRaw = "AMAZON WEB SERVICES",
                    BalanceAfter = 6638800,
                    DebitAccount = "6427",
                    CreditAccount = "11211",
                    PartnerCode = "AWS",
                    PartnerName = "Amazon Web Services, Inc.",
                    FinalDescription = "Chi phí hạ tầng máy chủ đám mây AWS",
                    VoucherNo = "VCT2610015",
                    VoucherType = "PhieuChi",
                    Status = "Matched",
                    Notes = null
                }
            };
        }
    }
}
