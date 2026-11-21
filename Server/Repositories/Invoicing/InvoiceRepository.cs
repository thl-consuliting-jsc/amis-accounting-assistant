using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Base;
using Dapper;
using Microsoft.Extensions.Configuration;

namespace AmisAssistant.Server.Repositories.Invoicing
{
    public class InvoiceRepository : BaseRepository<InvoiceDto, int>, IInvoiceRepository
    {
        public InvoiceRepository(IConfiguration configuration) : base(configuration) { }

        protected override string CustomTableName => "Invoices";

        protected override IEnumerable<string> IgnoredProperties => new[]
        {
            "InvoiceSymbol",
            "ItemName",
            "TaxRate",
            "PdfFileName",
            "HasPdf",
            "LookupUrl",
            "LookupCode",
            "RawFileSource"
        };

        public async Task<IEnumerable<InvoiceDto>> GetByCompanyIdAsync(int companyId, string? type = null, int? month = null, int? year = null)
        {
            using var conn = CreateConnection();
            const string sql = @"
                SELECT Id, CompanyId, InvoiceNo, InvoiceDate, PartnerCode, PartnerName, TaxCode,
                       PreTaxAmount, TaxAmount, TotalAmount, DebitAccount, CreditAccount,
                       InvoiceType, Status, Note, Month, Year
                FROM Invoices
                WHERE CompanyId = @CompanyId
                  AND (@Type IS NULL OR @Type = '' OR InvoiceType = @Type)
                  AND (@Month IS NULL OR Month = @Month)
                  AND (@Year IS NULL OR Year = @Year)
                ORDER BY InvoiceDate DESC, Id DESC;";
            return await conn.QueryAsync<InvoiceDto>(sql, new { CompanyId = companyId, Type = type, Month = month, Year = year });
        }
    }
}
