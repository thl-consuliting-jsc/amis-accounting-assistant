using System;
using System.Collections.Generic;

namespace AmisAssistant.Server.Models
{
    public class CompanyDto
    {
        public int Id { get; set; }
        public int TenantId { get; set; }
        public string TaxCode { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string? CompanyAddress { get; set; }
        public string? DataFolder { get; set; }
        public string? RulesPath { get; set; }
        public int FiscalYear { get; set; }
        public bool AutoFindPartner { get; set; }
        public int BankAccountCount { get; set; }
        public int RuleCount { get; set; }
        public int PartnerCount { get; set; }
    }

    public class BankAccountDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int BankProfileId { get; set; }
        public string BankName { get; set; } = "";
        public string BankCode { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public string AccountName { get; set; } = "";
        public string GlAccount { get; set; } = "";
        public string VoucherPrefixReceipt { get; set; } = "TG";
        public string VoucherPrefixPayment { get; set; } = "UN";
        public decimal InitialBalance { get; set; }
        public decimal CurrentBalance { get; set; }
        public bool IsActive { get; set; }
    }

    public class AccountingRuleDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int Priority { get; set; }
        public string RuleName { get; set; } = "";
        public string TransactionDirection { get; set; } = "ALL";
        public string Keywords { get; set; } = "";
        public string? ExcludeKeywords { get; set; }
        public string? PartnerKeywords { get; set; }
        public string? PartnerCode { get; set; }
        public string? PartnerName { get; set; }
        public string DebitAccount { get; set; } = "";
        public string CreditAccount { get; set; } = "";
        public string? DescriptionPattern { get; set; }
        public bool IsInternalTransfer { get; set; }
        public bool IsCardPayment { get; set; }
        public bool IsCcdc { get; set; }
        public string RuleType { get; set; } = "STANDARD";
        public string? Note { get; set; }
        public bool IsActive { get; set; }
    }

    public class PartnerDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string PartnerCode { get; set; } = "";
        public string PartnerName { get; set; } = "";
        public string NormalizedName { get; set; } = "";
        public string? TaxCode { get; set; }
        public string PartnerType { get; set; } = "NCC";
        public string? DefaultDebitAccount { get; set; }
        public string? DefaultCreditAccount { get; set; }
    }

    public class BankTransactionDto
    {
        public int Id { get; set; }
        public int BatchId { get; set; }
        public int BankAccountId { get; set; }
        public string BankName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public DateTime TransactionDate { get; set; }
        public string? RefNo { get; set; }
        public decimal Amount { get; set; }
        public string Direction { get; set; } = "IN";
        public string Description { get; set; } = "";
        public string? PartnerNameRaw { get; set; }
        public decimal BalanceAfter { get; set; }
        public string? DebitAccount { get; set; }
        public string? CreditAccount { get; set; }
        public string? PartnerCode { get; set; }
        public string? PartnerName { get; set; }
        public string? FinalDescription { get; set; }
        public string? VoucherNo { get; set; }
        public string? VoucherType { get; set; }
        public string Status { get; set; } = "Matched";
        public string? Notes { get; set; }
    }

    public class ReconciliationDto
    {
        public int BatchId { get; set; }
        public string PeriodName { get; set; } = "";
        public string Status { get; set; } = "";
        public bool IsReconciled { get; set; }
        public string? SummaryNotes { get; set; }
        public List<BankReconciliationSummaryDto> Accounts { get; set; } = new();
    }

    public class BankReconciliationSummaryDto
    {
        public int BankAccountId { get; set; }
        public string BankName { get; set; } = "";
        public string AccountNumber { get; set; } = "";
        public string GlAccount { get; set; } = "";
        public decimal OpeningBalance { get; set; }
        public decimal TotalIn { get; set; }
        public decimal TotalOut { get; set; }
        public decimal InternalTransferIn { get; set; }
        public decimal InternalTransferOut { get; set; }
        public decimal CalculatedClosingBalance { get; set; }
        public decimal StatementClosingBalance { get; set; }
        public decimal Difference { get; set; }
        public bool IsMatched { get; set; }
    }

    public class GeneratedFileDto
    {
        public string FileName { get; set; } = "";
        public string FilePath { get; set; } = "";
        public long FileSizeBytes { get; set; }
        public string FormattedSize { get; set; } = "";
        public string AmisTarget { get; set; } = "";
        public string Description { get; set; } = "";
        public DateTime? LastModified { get; set; }
        public bool Exists { get; set; } = true;
        public string? DownloadUrl { get; set; }
    }

    public class RunEngineResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public string Logs { get; set; } = "";
        public int FileCount { get; set; }
        public string OutputDirectory { get; set; } = "";
        public IEnumerable<GeneratedFileDto> Files { get; set; } = new List<GeneratedFileDto>();
        public ReconciliationDto? Reconciliation { get; set; }
    }

    public class InvoiceDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string InvoiceNo { get; set; } = "";
        public string InvoiceSymbol { get; set; } = ""; // Ký hiệu hóa đơn (VD: K26TTD, C26MCG)
        public DateTime InvoiceDate { get; set; }
        public string PartnerCode { get; set; } = "";
        public string PartnerName { get; set; } = "";
        public string TaxCode { get; set; } = "";
        public string ItemName { get; set; } = ""; // Tên hàng hóa, dịch vụ
        public string TaxRate { get; set; } = "10%"; // Thuế suất (8%, 10%, 0%)
        public decimal PreTaxAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        public string DebitAccount { get; set; } = "";
        public string CreditAccount { get; set; } = "";
        public string InvoiceType { get; set; } = "IN"; // IN = Mua vao, OUT = Ban ra
        public string Status { get; set; } = "Valid";
        public string? Note { get; set; }
        public string? PdfFileName { get; set; }
        public bool HasPdf { get; set; }
        public string? LookupUrl { get; set; }
        public string? LookupCode { get; set; }
        public string? RawFileSource { get; set; }
        public int Month { get; set; } = 10;
        public int Year { get; set; } = 2026;
    }

    // ==========================================
    // SOẠN THẢO VĂN BẢN & HỢP ĐỒNG TỰ ĐỘNG
    // ==========================================
    public class ContractTemplateDto
    {
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string Category { get; set; } = "Hợp đồng"; // Lao động, Vay vốn, Thuê OS, Kinh tế đầu ra...
        public string Description { get; set; } = "";
        public List<string> RequiredFields { get; set; } = new();
    }

    public class ContractDocumentDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string ContractCode { get; set; } = "";
        public string Title { get; set; } = "";
        public string TemplateCode { get; set; } = "";
        public string? TemplateName { get; set; }
        public string Category { get; set; } = "";
        public string PartnerName { get; set; } = "";
        public string PartnerTaxCode { get; set; } = "";
        public string PartnerAddress { get; set; } = "";
        public string Representative { get; set; } = "";
        public decimal ContractValue { get; set; }
        public DateTime SignDate { get; set; } = DateTime.Now;
        public DateTime? EffectiveDate { get; set; }
        public DateTime? ExpireDate { get; set; }
        public string Status { get; set; } = "Draft"; // Draft, Signed, Expired
        public string? ContentHtml { get; set; }
        public string? FileName { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }

    public class GenerateContractRequest
    {
        public int CompanyId { get; set; }
        public string TemplateCode { get; set; } = "";
        public string Title { get; set; } = "";
        public string PartnerName { get; set; } = "";
        public string PartnerTaxCode { get; set; } = "";
        public string PartnerAddress { get; set; } = "";
        public string Representative { get; set; } = "";
        public string Position { get; set; } = "";
        public decimal ContractValue { get; set; }
        public DateTime SignDate { get; set; } = DateTime.Now;
        public DateTime? EffectiveDate { get; set; }
        public DateTime? ExpireDate { get; set; }
        public string Details { get; set; } = "";
        public int? CashFlowId { get; set; } // Liên kết từ khoản dự chi đã duyệt (nếu có)
    }

    // ==========================================
    // DỰ KIẾN THU CHI & PHÊ DUYỆT CHI
    // ==========================================
    public class CashFlowPlanDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int Month { get; set; } = 10;
        public int Year { get; set; } = 2026;
        public string Title { get; set; } = "";
        public string FlowType { get; set; } = "EXPENSE"; // REVENUE (Dự thu), EXPENSE (Dự chi)
        public string Category { get; set; } = ""; // Lương, Thuê VP, Server OS, Hóa đơn mua vào, CCDC, Phát sinh
        public decimal EstimatedAmount { get; set; }
        public decimal ActualAmount { get; set; }
        public string Source { get; set; } = "Báo cáo AMIS"; // Báo cáo AMIS, Phát sinh mới, Hóa đơn
        public string Status { get; set; } = "Pending"; // Pending (Chờ duyệt), Approved (Đã duyệt), Rejected (Từ chối)
        public string? Note { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public int? GeneratedContractId { get; set; }
        public string? ContractCode { get; set; }
    }

    public class ApproveCashFlowRequest
    {
        public string Status { get; set; } = "Approved"; // Approved, Rejected
        public string? ApproverName { get; set; }
        public string? Note { get; set; }
        public bool AutoGenerateContract { get; set; } = false;
    }

    // ==========================================
    // CỔNG TRA CỨU KHÁCH HÀNG & TRỢ LÝ THÔNG MINH
    // ==========================================
    public class CustomerDebtDto
    {
        public string CustomerCode { get; set; } = "";
        public string CustomerName { get; set; } = "";
        public string TaxCode { get; set; } = "";
        public decimal BeginningDebt { get; set; } // Nợ đầu kỳ
        public decimal IncreaseDebt { get; set; }  // Phát sinh nợ trong kỳ (Mua hàng)
        public decimal DecreaseDebt { get; set; }  // Đã thanh toán
        public decimal EndingDebt { get; set; }    // Nợ cuối kỳ
        public int UnpaidInvoiceCount { get; set; }
        public string Status { get; set; } = "Trong hạn"; // Trong hạn, Quá hạn
    }

    public class InventoryItemDto
    {
        public string ItemCode { get; set; } = "";
        public string ItemName { get; set; } = "";
        public string Unit { get; set; } = "Cái";
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalValue { get; set; }
        public string Warehouse { get; set; } = "Kho Tổng";
        public string Status { get; set; } = "Sẵn sàng"; // Sẵn sàng, Sắp hết, Tạm giữ
    }

    public class CustomerQueryRequest
    {
        public int CompanyId { get; set; }
        public string Query { get; set; } = "";
        public string? CustomerCode { get; set; }
    }

    public class CustomerQueryResponse
    {
        public string Answer { get; set; } = "";
        public string QueryType { get; set; } = "GENERAL"; // DEBT, INVENTORY, INVOICE, GENERAL
        public object? Data { get; set; }
    }

    public class CcdcDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public decimal OriginalPrice { get; set; }
        public int AllocationPeriods { get; set; } = 12;
        public string InvoiceRef { get; set; } = "";
        public string Unit { get; set; } = "Cái";
        public int Month { get; set; } = 10;
        public int Year { get; set; } = 2026;
    }

    public class PartnerAliasDto
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public string RawPartnerName { get; set; } = "";
        public string PartnerCode { get; set; } = "";
        public string? Note { get; set; }
        public DateTime? CreatedAt { get; set; }
    }

    public class VatIndicatorDto
    {
        public string Code { get; set; } = "";
        public string Description { get; set; } = "";
        public decimal Amount { get; set; }
        public decimal TaxAmount { get; set; }
        public string Note { get; set; } = "";
    }

    public class RunEngineRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public string? BaseDir { get; set; }
    }

    public class SaveAliasRequest
    {
        public string RawName { get; set; } = "";
        public string PartnerCode { get; set; } = "";
        public string? Note { get; set; }
    }

    public class SyncHeartbeatRequest
    {
        public string? Machine { get; set; }
        public string? TaxCode { get; set; }
        public string? AgentVersion { get; set; }
        public string? LocalFolder { get; set; }
        public int SyncedFilesCount { get; set; }
    }

    public class WebRunRequestDto
    {
        public int CompanyId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string? TaxCode { get; set; }
        public string? CompanyName { get; set; }
        public string? DataFolder { get; set; }
        public string? Machine { get; set; }
    }

    public class WebJobSession
    {
        public string JobId { get; set; } = "";
        public int CompanyId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }
        public string? TaxCode { get; set; }
        public string? CompanyName { get; set; }
        public string? DataFolder { get; set; }
        public string Status { get; set; } = "WAITING_FILES"; // WAITING_FILES, RECEIVING_FILES, PROCESSING, COMPLETED, FAILED
        public string Message { get; set; } = "Đang chờ Trợ lý trên máy lấy dữ liệu...";
        public int FileCount { get; set; }
        public string TempDir { get; set; } = "";
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public RunEngineResultDto? Result { get; set; }
        public byte[]? ZipBytes { get; set; }
    }

    public class OpenFolderRequest
    {
        public int? Month { get; set; }
        public int? Year { get; set; }
        public string? CustomFolder { get; set; }
    }

    public class OpenPathRequest
    {
        public string? Path { get; set; }
    }

    public class SaveFileRequest
    {
        public string FolderPath { get; set; } = "";
        public string FileName { get; set; } = "";
        public string FileData { get; set; } = "";
        public bool OpenExplorer { get; set; } = true;
    }
}
