using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.Invoicing;
using AmisAssistant.Server.Repositories.MasterData;
using AmisAssistant.Server.Services.SystemDomain;
using ClosedXML.Excel;

namespace AmisAssistant.Server.Services.Invoicing
{
    public class InvoicingService : IInvoicingService
    {
        private readonly ICompanyRepository _companyRepo;
        private readonly IInvoiceRepository _invoiceRepo;
        private readonly ISystemFileService _fileService;

        public InvoicingService(
            ICompanyRepository companyRepo,
            IInvoiceRepository invoiceRepo,
            ISystemFileService fileService)
        {
            _companyRepo = companyRepo;
            _invoiceRepo = invoiceRepo;
            _fileService = fileService;
        }

        public async Task<IEnumerable<InvoiceDto>> GetInvoicesAsync(int companyId, string? type = null, int? month = null, int? year = null)
        {
            int m = month ?? 10;
            int y = year ?? 2026;

            try
            {
                var comp = await _companyRepo.GetByIdAsync(companyId);
                if (comp != null)
                {
                    string baseDir = _fileService.GetCompanyBaseDir(comp);
                    string? monthFolder = FindMonthFolder(baseDir, m, y);
                    if (!string.IsNullOrEmpty(monthFolder) && Directory.Exists(monthFolder))
                    {
                        var fileInvoices = ParseInvoicesFromExcel(monthFolder, type, m, y, companyId, comp.TaxCode);
                        if (fileInvoices.Count > 0)
                        {
                            return fileInvoices;
                        }
                    }
                }

                // Fallback to DB
                var list = (await _invoiceRepo.GetByCompanyIdAsync(companyId, type, month, year)).ToList();
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetInvoicesAsync Error]: {ex.Message}");
            }

            return new List<InvoiceDto>();
        }

        public async Task<string?> GetInvoicePdfPathAsync(int companyId, string fileName, string? type, int month, int year)
        {
            try
            {
                var comp = await _companyRepo.GetByIdAsync(companyId);
                if (comp == null) return null;
                string baseDir = _fileService.GetCompanyBaseDir(comp);
                string? monthFolder = FindMonthFolder(baseDir, month, year);
                if (string.IsNullOrEmpty(monthFolder) || !Directory.Exists(monthFolder)) return null;

                string cleanName = Path.GetFileNameWithoutExtension(fileName).Trim();
                var pdfFiles = Directory.GetFiles(monthFolder, "*.pdf", SearchOption.AllDirectories);
                var matched = pdfFiles.FirstOrDefault(p => 
                    Path.GetFileNameWithoutExtension(p).Equals(cleanName, StringComparison.OrdinalIgnoreCase) ||
                    Path.GetFileName(p).Equals(fileName, StringComparison.OrdinalIgnoreCase));
                return matched;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[GetInvoicePdfPathAsync Error]: {ex.Message}");
                return null;
            }
        }

        public async Task<int> CreateInvoiceAsync(InvoiceDto invoice)
        {
            return await _invoiceRepo.InsertAsync(invoice);
        }

        public async Task<bool> UpdateInvoiceAsync(InvoiceDto invoice)
        {
            return await _invoiceRepo.UpdateAsync(invoice);
        }

        public async Task<bool> DeleteInvoiceAsync(int invoiceId)
        {
            return await _invoiceRepo.DeleteAsync(invoiceId);
        }

        private string? FindMonthFolder(string baseDir, int month, int year)
        {
            if (string.IsNullOrWhiteSpace(baseDir) || !Directory.Exists(baseDir)) return null;

            string[] candidates = new[]
            {
                Path.Combine(baseDir, "5. DU LIEU", $"THANG {month:D2}.{year}"),
                Path.Combine(baseDir, $"THANG {month:D2}.{year}"),
                Path.Combine(baseDir, "5. DU LIEU", $"THANG {month}.{year}"),
                Path.Combine(baseDir, $"THANG {month}.{year}")
            };

            foreach (var c in candidates)
            {
                if (Directory.Exists(c)) return c;
            }

            string searchRoot = Directory.Exists(Path.Combine(baseDir, "5. DU LIEU"))
                ? Path.Combine(baseDir, "5. DU LIEU")
                : baseDir;

            if (Directory.Exists(searchRoot))
            {
                var dirs = Directory.GetDirectories(searchRoot, "*THANG*", SearchOption.TopDirectoryOnly);
                var matched = dirs.FirstOrDefault(d =>
                    d.IndexOf($"{month:D2}.{year}", StringComparison.OrdinalIgnoreCase) >= 0 ||
                    d.IndexOf($"{month}.{year}", StringComparison.OrdinalIgnoreCase) >= 0);
                if (matched != null) return matched;
            }

            return null;
        }

        private List<InvoiceDto> ParseInvoicesFromExcel(string monthFolder, string? type, int month, int year, int companyId, string? companyTaxCode)
        {
            var list = new List<InvoiceDto>();
            try
            {
                bool isPurchase = string.IsNullOrEmpty(type) || type.Equals("PURCHASE", StringComparison.OrdinalIgnoreCase) || type.Equals("IN", StringComparison.OrdinalIgnoreCase);
                bool isSold = !string.IsNullOrEmpty(type) && (type.Equals("SOLD", StringComparison.OrdinalIgnoreCase) || type.Equals("OUT", StringComparison.OrdinalIgnoreCase));

                var allXlsx = Directory.GetFiles(monthFolder, "*.xlsx", SearchOption.AllDirectories)
                    .Where(f => !Path.GetFileName(f).StartsWith("~$"))
                    .ToList();

                var pdfFiles = Directory.GetFiles(monthFolder, "*.pdf", SearchOption.AllDirectories).ToList();

                if (isPurchase)
                {
                    var pFiles = allXlsx.Where(f =>
                        f.IndexOf("MuaVao", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        f.IndexOf("mua_vao", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        f.IndexOf("MUA HANG", StringComparison.OrdinalIgnoreCase) >= 0
                    ).ToList();

                    var summaryFile = pFiles.FirstOrDefault(f => f.IndexOf("HDCTMuaVao", StringComparison.OrdinalIgnoreCase) >= 0) ?? pFiles.FirstOrDefault();
                    var detailFile = pFiles.FirstOrDefault(f => f.IndexOf("Chi_tiet", StringComparison.OrdinalIgnoreCase) >= 0);

                    var detailMap = new Dictionary<string, (string ItemName, string TaxRate)>(StringComparer.OrdinalIgnoreCase);
                    if (detailFile != null)
                    {
                        ReadDetailMap(detailFile, detailMap);
                    }

                    if (summaryFile != null)
                    {
                        list.AddRange(ReadSummaryInvoices(summaryFile, "IN", month, year, companyId, pdfFiles, detailMap));
                    }
                    else if (detailFile != null)
                    {
                        list.AddRange(ReadDetailInvoices(detailFile, "IN", month, year, companyId, pdfFiles));
                    }
                }

                if (isSold)
                {
                    var sFiles = allXlsx.Where(f =>
                        f.IndexOf("BanRa", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        f.IndexOf("ban_ra", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        f.IndexOf("BAN HANG", StringComparison.OrdinalIgnoreCase) >= 0
                    ).ToList();

                    var summaryFile = sFiles.FirstOrDefault(f => f.IndexOf("HDCTBanRa", StringComparison.OrdinalIgnoreCase) >= 0) ?? sFiles.FirstOrDefault();
                    var detailFile = sFiles.FirstOrDefault(f => f.IndexOf("Chi_tiet", StringComparison.OrdinalIgnoreCase) >= 0);

                    var detailMap = new Dictionary<string, (string ItemName, string TaxRate)>(StringComparer.OrdinalIgnoreCase);
                    if (detailFile != null)
                    {
                        ReadDetailMap(detailFile, detailMap);
                    }

                    if (summaryFile != null)
                    {
                        list.AddRange(ReadSummaryInvoices(summaryFile, "OUT", month, year, companyId, pdfFiles, detailMap));
                    }
                    else if (detailFile != null)
                    {
                        list.AddRange(ReadDetailInvoices(detailFile, "OUT", month, year, companyId, pdfFiles));
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ParseInvoicesFromExcel Error]: {ex.Message}");
            }
            return list;
        }

        private void ReadDetailMap(string filePath, Dictionary<string, (string ItemName, string TaxRate)> map)
        {
            try
            {
                using var wb = new XLWorkbook(filePath);
                var ws = wb.Worksheets.FirstOrDefault();
                if (ws == null) return;

                int lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
                int colInvNo = 3;
                int colItem = 13;
                int colTaxRate = 18;

                // Auto find headers
                for (int r = 1; r <= Math.Min(10, lastRow); r++)
                {
                    var row = ws.Row(r);
                    int lastCol = row.LastCellUsed()?.Address.ColumnNumber ?? 0;
                    for (int c = 1; c <= lastCol; c++)
                    {
                        string h = row.Cell(c).GetString().Trim().ToLowerInvariant();
                        if (h.Contains("số hóa đơn")) colInvNo = c;
                        else if (h.Contains("tên hàng hóa")) colItem = c;
                        else if (h.Contains("thuế suất")) colTaxRate = c;
                    }
                }

                for (int r = 3; r <= lastRow; r++)
                {
                    var row = ws.Row(r);
                    string no = row.Cell(colInvNo).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(no)) continue;

                    string item = row.Cell(colItem).GetString().Trim();
                    string rate = row.Cell(colTaxRate).GetString().Trim();
                    if (decimal.TryParse(rate, out var dRate))
                    {
                        rate = $"{dRate * 100:0.#}%";
                    }

                    if (!map.ContainsKey(no) && !string.IsNullOrEmpty(item))
                    {
                        map[no] = (item, string.IsNullOrEmpty(rate) ? "10%" : rate);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ReadDetailMap Error]: {ex.Message}");
            }
        }

        private List<InvoiceDto> ReadSummaryInvoices(string filePath, string invoiceType, int month, int year, int companyId, List<string> pdfFiles, Dictionary<string, (string ItemName, string TaxRate)> detailMap)
        {
            var result = new List<InvoiceDto>();
            try
            {
                using var wb = new XLWorkbook(filePath);
                var ws = wb.Worksheets.FirstOrDefault();
                if (ws == null) return result;

                int headerRow = -1;
                int colInvNo = -1, colSymbol = -1, colDate = -1, colSellerTax = -1, colSellerName = -1;
                int colBuyerTax = -1, colBuyerName = -1, colPreTax = -1, colTax = -1, colTotal = -1, colStatus = -1, colPdf = -1;

                int lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
                for (int r = 1; r <= Math.Min(25, lastRow); r++)
                {
                    var row = ws.Row(r);
                    int lastCol = row.LastCellUsed()?.Address.ColumnNumber ?? 0;
                    for (int c = 1; c <= lastCol; c++)
                    {
                        string t = row.Cell(c).GetString().Trim();
                        if (t.IndexOf("Số hóa đơn", StringComparison.OrdinalIgnoreCase) >= 0 || t.Equals("Số HĐ", StringComparison.OrdinalIgnoreCase))
                        {
                            headerRow = r;
                            break;
                        }
                    }
                    if (headerRow != -1) break;
                }

                if (headerRow == -1) headerRow = 1;

                var hRow = ws.Row(headerRow);
                int hLastCol = hRow.LastCellUsed()?.Address.ColumnNumber ?? 0;
                for (int c = 1; c <= hLastCol; c++)
                {
                    string h = hRow.Cell(c).GetString().Trim().ToLowerInvariant();
                    if (h.Contains("số hóa đơn") || h.Equals("số hđ")) colInvNo = c;
                    else if (h.Contains("ký hiệu") || h.Contains("mẫu số")) colSymbol = c;
                    else if (h.Contains("ngày hóa đơn") || h.Contains("ngày lập")) colDate = c;
                    else if (h.Contains("mst người bán") || h.Contains("mã số thuế người bán")) colSellerTax = c;
                    else if (h.Contains("tên người bán")) colSellerName = c;
                    else if (h.Contains("mst người mua") || h.Contains("mã số thuế người mua")) colBuyerTax = c;
                    else if (h.Contains("tên người mua")) colBuyerName = c;
                    else if (h.Contains("tổng tiền chưa thuế") || h.Contains("tiền chưa thuế")) colPreTax = c;
                    else if (h.Contains("tiền thuế") || h.Contains("thuế gtgt")) colTax = c;
                    else if (h.Contains("tổng tiền thanh toán") || h.Contains("tổng cộng")) colTotal = c;
                    else if (h.Contains("trạng thái")) colStatus = c;
                    else if (h.Contains("tên file") || h.Contains("pdf")) colPdf = c;
                }

                if (colInvNo == -1) colInvNo = 3;
                if (colSymbol == -1) colSymbol = 2;
                if (colDate == -1) colDate = 4;
                if (colPreTax == -1) colPreTax = 22;
                if (colTax == -1) colTax = 23;
                if (colTotal == -1) colTotal = 29;

                int idCounter = 1;
                for (int r = headerRow + 1; r <= lastRow; r++)
                {
                    var row = ws.Row(r);
                    string rawNo = row.Cell(colInvNo).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(rawNo)) continue;

                    string symbol = colSymbol > 0 ? row.Cell(colSymbol).GetString().Trim() : "";
                    string dateStr = colDate > 0 ? row.Cell(colDate).GetString().Trim() : "";
                    DateTime invDate = DateTime.TryParse(dateStr, out var dVal) ? dVal : new DateTime(year, month, 1);

                    string pName = invoiceType == "IN"
                        ? (colSellerName > 0 ? row.Cell(colSellerName).GetString().Trim() : "")
                        : (colBuyerName > 0 ? row.Cell(colBuyerName).GetString().Trim() : "");

                    string pTax = invoiceType == "IN"
                        ? (colSellerTax > 0 ? row.Cell(colSellerTax).GetString().Trim() : "")
                        : (colBuyerTax > 0 ? row.Cell(colBuyerTax).GetString().Trim() : "");

                    decimal preTax = colPreTax > 0 ? ParseCellDecimal(row.Cell(colPreTax)) : 0m;
                    decimal tax = colTax > 0 ? ParseCellDecimal(row.Cell(colTax)) : 0m;
                    decimal total = colTotal > 0 ? ParseCellDecimal(row.Cell(colTotal)) : 0m;
                    if (total == 0) total = preTax + tax;

                    string status = colStatus > 0 ? row.Cell(colStatus).GetString().Trim() : "Hợp lệ";
                    if (string.IsNullOrEmpty(status)) status = "Hợp lệ";

                    string pdfName = colPdf > 0 ? row.Cell(colPdf).GetString().Trim() : "";
                    bool hasPdf = false;
                    string? matchedPdf = null;

                    string lookupNo = rawNo.PadLeft(7, '0');
                    var match = pdfFiles.FirstOrDefault(p =>
                    {
                        string fn = Path.GetFileNameWithoutExtension(p);
                        return fn.Equals(rawNo, StringComparison.OrdinalIgnoreCase) ||
                               fn.Equals(lookupNo, StringComparison.OrdinalIgnoreCase) ||
                               fn.EndsWith($"_{rawNo}", StringComparison.OrdinalIgnoreCase) ||
                               fn.EndsWith($"_{lookupNo}", StringComparison.OrdinalIgnoreCase) ||
                               (!string.IsNullOrEmpty(pdfName) && fn.Equals(Path.GetFileNameWithoutExtension(pdfName), StringComparison.OrdinalIgnoreCase));
                    });

                    if (match != null)
                    {
                        hasPdf = true;
                        matchedPdf = Path.GetFileName(match);
                    }

                    string itemName = "";
                    string taxRate = "10%";
                    if (detailMap.TryGetValue(rawNo, out var dInfo) || detailMap.TryGetValue(lookupNo, out dInfo))
                    {
                        itemName = dInfo.ItemName;
                        taxRate = dInfo.TaxRate;
                    }

                    result.Add(new InvoiceDto
                    {
                        Id = idCounter++,
                        CompanyId = companyId,
                        InvoiceNo = rawNo,
                        InvoiceSymbol = symbol,
                        InvoiceDate = invDate,
                        PartnerCode = pTax,
                        PartnerName = pName,
                        TaxCode = pTax,
                        ItemName = itemName,
                        TaxRate = taxRate,
                        PreTaxAmount = preTax,
                        TaxAmount = tax,
                        TotalAmount = total,
                        DebitAccount = invoiceType == "IN" ? "6427" : "131",
                        CreditAccount = invoiceType == "IN" ? "331" : "5111",
                        InvoiceType = invoiceType,
                        Status = status,
                        PdfFileName = matchedPdf ?? (hasPdf ? $"{rawNo}.pdf" : null),
                        HasPdf = hasPdf,
                        RawFileSource = Path.GetFileName(filePath),
                        Month = month,
                        Year = year
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ReadSummaryInvoices Error]: {ex.Message}");
            }
            return result;
        }

        private List<InvoiceDto> ReadDetailInvoices(string filePath, string invoiceType, int month, int year, int companyId, List<string> pdfFiles)
        {
            var result = new List<InvoiceDto>();
            try
            {
                using var wb = new XLWorkbook(filePath);
                var ws = wb.Worksheets.FirstOrDefault();
                if (ws == null) return result;

                int lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
                int idCounter = 1;
                for (int r = 3; r <= lastRow; r++)
                {
                    var row = ws.Row(r);
                    string rawNo = row.Cell(3).GetString().Trim();
                    if (string.IsNullOrWhiteSpace(rawNo)) continue;

                    string symbol = row.Cell(2).GetString().Trim();
                    string dateStr = row.Cell(4).GetString().Trim();
                    DateTime invDate = DateTime.TryParse(dateStr, out var dVal) ? dVal : new DateTime(year, month, 1);

                    string pName = invoiceType == "IN" ? row.Cell(6).GetString().Trim() : row.Cell(9).GetString().Trim();
                    string pTax = invoiceType == "IN" ? row.Cell(7).GetString().Trim() : row.Cell(10).GetString().Trim();
                    string itemName = row.Cell(13).GetString().Trim();

                    decimal preTax = ParseCellDecimal(row.Cell(22));
                    decimal tax = ParseCellDecimal(row.Cell(23));
                    decimal total = ParseCellDecimal(row.Cell(29));
                    if (total == 0) total = preTax + tax;

                    string pdfName = row.Cell(30).GetString().Trim();
                    bool hasPdf = false;
                    string? matchedPdf = null;
                    if (!string.IsNullOrEmpty(pdfName))
                    {
                        var match = pdfFiles.FirstOrDefault(p => Path.GetFileNameWithoutExtension(p).Equals(pdfName, StringComparison.OrdinalIgnoreCase));
                        if (match != null)
                        {
                            hasPdf = true;
                            matchedPdf = Path.GetFileName(match);
                        }
                    }

                    result.Add(new InvoiceDto
                    {
                        Id = idCounter++,
                        CompanyId = companyId,
                        InvoiceNo = rawNo,
                        InvoiceSymbol = symbol,
                        InvoiceDate = invDate,
                        PartnerCode = pTax,
                        PartnerName = pName,
                        TaxCode = pTax,
                        ItemName = itemName,
                        TaxRate = "10%",
                        PreTaxAmount = preTax,
                        TaxAmount = tax,
                        TotalAmount = total,
                        DebitAccount = invoiceType == "IN" ? "6427" : "131",
                        CreditAccount = invoiceType == "IN" ? "331" : "5111",
                        InvoiceType = invoiceType,
                        Status = "Hóa đơn mới",
                        PdfFileName = matchedPdf ?? (hasPdf ? $"{pdfName}.pdf" : null),
                        HasPdf = hasPdf,
                        RawFileSource = Path.GetFileName(filePath),
                        Month = month,
                        Year = year
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ReadDetailInvoices Error]: {ex.Message}");
            }
            return result;
        }

        private static decimal ParseCellDecimal(IXLCell cell)
        {
            if (cell == null || cell.IsEmpty()) return 0m;
            try
            {
                if (cell.DataType == XLDataType.Number) return (decimal)cell.GetDouble();
                string s = cell.GetString().Replace(",", "").Trim();
                if (decimal.TryParse(s, out var v)) return v;
            }
            catch { }
            return 0m;
        }
    }
}
