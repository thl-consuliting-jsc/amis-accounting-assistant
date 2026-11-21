using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.Invoicing
{
    public interface IInvoicingService
    {
        Task<IEnumerable<InvoiceDto>> GetInvoicesAsync(int companyId, string? type = null, int? month = null, int? year = null);
        Task<int> CreateInvoiceAsync(InvoiceDto invoice);
        Task<bool> UpdateInvoiceAsync(InvoiceDto invoice);
        Task<bool> DeleteInvoiceAsync(int invoiceId);
        Task<string?> GetInvoicePdfPathAsync(int companyId, string fileName, string? type, int month, int year);
    }
}
