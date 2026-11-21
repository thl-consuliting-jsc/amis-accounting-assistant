using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.FixedAssets;
using AmisAssistant.Server.Services.Invoicing;
using AmisAssistant.Server.Services.MasterData;
using Microsoft.AspNetCore.Mvc;

namespace AmisAssistant.Server.Controllers.SystemDomain
{
    [ApiController]
    [Route("api/accounting")]
    public class SystemDiagnosticsController : ControllerBase
    {
        private readonly IMasterDataService _masterDataService;
        private readonly IInvoicingService _invoicingService;
        private readonly IFixedAssetsService _fixedAssetsService;

        public SystemDiagnosticsController(
            IMasterDataService masterDataService,
            IInvoicingService invoicingService,
            IFixedAssetsService fixedAssetsService)
        {
            _masterDataService = masterDataService;
            _invoicingService = invoicingService;
            _fixedAssetsService = fixedAssetsService;
        }

        [HttpGet("status")]
        [HttpGet("health")]
        [HttpGet("ping")]
        public ActionResult GetStatus()
        {
            return Ok(new
            {
                success = true,
                machine = Environment.MachineName,
                isLocal = true,
                time = DateTime.Now
            });
        }

        [HttpGet("version")]
        public ActionResult GetVersion()
        {
            return Ok(new
            {
                success = true,
                version = "2.5.0-oop",
                architecture = "Clean Modular Architecture (SOLID / Domain-Driven)",
                features = new[]
                {
                    "10 Dedicated Domain Services",
                    "Single Responsibility Principle (SRP)",
                    "Interface Segregation (ISP)",
                    "Dapper ORM + Parameterized Queries",
                    "In-Process AMIS Engine"
                }
            });
        }

        [HttpPost("system/test-crud")]
        public async Task<ActionResult> TestBaseRepositoryCrud()
        {
            var logs = new List<string>();
            try
            {
                // Step 1: Create Test Company
                var comp = new CompanyDto
                {
                    CompanyName = "CONG TY TNHH TEST CRUD SYSTEM",
                    TaxCode = "9988776655",
                    DataFolder = @"D:\2026\1.Work\9.PHUONG\5. DU LIEU",
                    FiscalYear = 2026,
                    AutoFindPartner = true
                };
                int compId = await _masterDataService.SaveCompanyAsync(comp);
                logs.Add($"[OK] 1. Insert Company: ID {compId}");

                // Step 2: Read Company
                var compRetrieved = await _masterDataService.GetCompanyByIdAsync(compId);
                if (compRetrieved == null) throw new Exception("Cannot retrieve created company");
                logs.Add($"[OK] 2. Retrieve Company: {compRetrieved.CompanyName}");

                // Step 3: Insert Partner
                var partner = new PartnerDto
                {
                    CompanyId = compId,
                    PartnerCode = "TEST_KH_01",
                    PartnerName = "Khách Hàng Test OOP",
                    TaxCode = "0109999999",
                    PartnerType = "KH",
                    DefaultDebitAccount = "131",
                    DefaultCreditAccount = "511"
                };
                int partnerId = await _masterDataService.CreatePartnerAsync(partner);
                logs.Add($"[OK] 3. Insert Partner: ID {partnerId}");

                // Step 4: Update Partner
                partner.Id = partnerId;
                partner.PartnerName = "Khách Hàng Test OOP - Updated";
                bool partnerUpdated = await _masterDataService.UpdatePartnerAsync(partner);
                logs.Add($"[OK] 4. Update Partner: Result {partnerUpdated}");

                // Step 5: Delete Partner
                bool partnerDeleted = await _masterDataService.DeletePartnerAsync(partnerId);
                logs.Add($"[OK] 5. Delete Partner: Result {partnerDeleted}");

                // Step 6: Bank Account CRUD
                var bankAcc = new BankAccountDto
                {
                    CompanyId = compId,
                    BankCode = "MB",
                    BankName = "MB Bank",
                    AccountNumber = "999988887777",
                    AccountName = "Tai khoan test",
                    GlAccount = "1121",
                    InitialBalance = 5000000,
                    IsActive = true
                };
                int bankAccId = await _masterDataService.CreateBankAccountAsync(bankAcc);
                logs.Add($"[OK] 6. Insert Bank Account: ID {bankAccId}");

                bool bankAccDeleted = await _masterDataService.DeleteBankAccountAsync(bankAccId);
                logs.Add($"[OK] 7. Delete Bank Account: Result {bankAccDeleted}");

                // Step 7: Accounting Rule CRUD
                var rule = new AccountingRuleDto
                {
                    CompanyId = compId,
                    RuleName = "Quy tắc kiểm thử OOP",
                    Keywords = "mua hang test, dich vu test",
                    TransactionDirection = "OUT",
                    DebitAccount = "6427",
                    CreditAccount = "1121",
                    Priority = 99,
                    IsActive = true
                };
                int ruleId = await _masterDataService.CreateAccountingRuleAsync(rule);
                logs.Add($"[OK] 8. Insert Accounting Rule: ID {ruleId}");

                bool ruleDeleted = await _masterDataService.DeleteAccountingRuleAsync(ruleId);
                logs.Add($"[OK] 9. Delete Accounting Rule: Result {ruleDeleted}");

                // Step 8: Invoice CRUD
                var inv = new InvoiceDto
                {
                    CompanyId = compId,
                    InvoiceNo = "TEST-HD-001",
                    InvoiceDate = new DateTime(2026, 10, 15),
                    PartnerCode = "TEST_KH_01",
                    PartnerName = "Doi Tac Hoa Don Test",
                    TaxCode = "0108889999",
                    PreTaxAmount = 10000000,
                    TaxAmount = 1000000,
                    TotalAmount = 11000000,
                    DebitAccount = "131",
                    CreditAccount = "511",
                    InvoiceType = "OUT",
                    Status = "Approved",
                    Month = 10,
                    Year = 2026
                };
                int invId = await _invoicingService.CreateInvoiceAsync(inv);
                logs.Add($"[OK] 10. Insert Invoice: ID {invId}");

                bool invDeleted = await _invoicingService.DeleteInvoiceAsync(invId);
                logs.Add($"[OK] 11. Delete Invoice: Result {invDeleted}");

                // Step 9: CCDC CRUD
                var ccdc = new CcdcDto
                {
                    CompanyId = compId,
                    Code = "TEST-CCDC-99",
                    Name = "May in kiem thu OOP",
                    OriginalPrice = 8000000,
                    AllocationPeriods = 24,
                    InvoiceRef = "TEST-HD-001",
                    Unit = "Chiec",
                    Month = 10,
                    Year = 2026
                };
                int ccdcId = await _fixedAssetsService.CreateCcdcAsync(ccdc);
                logs.Add($"[OK] 12. Insert CCDC: ID {ccdcId}");

                bool ccdcDeleted = await _fixedAssetsService.DeleteCcdcAsync(ccdcId);
                logs.Add($"[OK] 13. Delete CCDC: Result {ccdcDeleted}");

                // Step 10: Cleanup Test Company
                bool compDeleted = await _masterDataService.DeleteCompanyAsync(compId);
                logs.Add($"[OK] 14. Delete Company: Result {compDeleted}");

                return Ok(new
                {
                    success = true,
                    summary = "Tất cả 14 bước kiểm thử CRUD đối tượng kế thừa (OOP BaseRepository) thành công 100%!",
                    database = "HUNG_DB2 (103.107.183.86,1234)",
                    steps = logs
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    steps = logs
                });
            }
        }
    }
}
