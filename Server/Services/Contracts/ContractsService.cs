using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Repositories.MasterData;

namespace AmisAssistant.Server.Services.Contracts
{
    public class ContractsService : IContractsService
    {
        private readonly ICompanyRepository _companyRepo;
        private static readonly List<ContractDocumentDto> _contractsStore = new();
        private static readonly object _contractsLock = new();

        public ContractsService(ICompanyRepository companyRepo)
        {
            _companyRepo = companyRepo;
        }

        public Task<IEnumerable<ContractTemplateDto>> GetContractTemplatesAsync()
        {
            var list = new List<ContractTemplateDto>
            {
                new ContractTemplateDto
                {
                    Code = "HDLD",
                    Name = "Hợp đồng lao động tiêu chuẩn",
                    Category = "Nhân sự",
                    Description = "Mẫu hợp đồng lao động theo Bộ luật Lao động 2019, tự động lập thời hạn, mức lương, phụ cấp, chức danh.",
                    RequiredFields = new() { "Họ tên người lao động", "Số CCCD", "Chức vụ / Vị trí", "Mức lương cơ bản", "Thời hạn hợp đồng", "Địa điểm làm việc" }
                },
                new ContractTemplateDto
                {
                    Code = "VAY_VON",
                    Name = "Hồ sơ đề nghị vay vốn & Phương án dòng tiền",
                    Category = "Ngân hàng",
                    Description = "Giấy đề nghị vay vốn ngân hàng, phương án vay trả nợ theo sao kê và dòng tiền kinh doanh của doanh nghiệp.",
                    RequiredFields = new() { "Tên ngân hàng / Bên cho vay", "Số tiền vay", "Mục đích sử dụng vốn", "Thời hạn vay (tháng)", "Lãi suất thỏa thuận", "Tài sản bảo đảm" }
                },
                new ContractTemplateDto
                {
                    Code = "THUE_SERVER",
                    Name = "Hợp đồng thuê Server, License OS & Dịch vụ Cloud",
                    Category = "Công nghệ & Hạ tầng",
                    Description = "Hợp đồng thuê máy chủ chuyên dụng, license hệ điều hành Windows/Linux Server và hạ tầng điện toán đám mây.",
                    RequiredFields = new() { "Nhà cung cấp hạ tầng", "Cấu hình Server / OS", "Phí dịch vụ hàng tháng", "Thời hạn thuê", "Cam kết SLA" }
                },
                new ContractTemplateDto
                {
                    Code = "HD_KINH_TE",
                    Name = "Hợp đồng kinh tế đầu ra / Cung cấp dịch vụ",
                    Category = "Kinh doanh",
                    Description = "Hợp đồng kinh tế thương mại cung cấp hàng hóa, phần mềm và dịch vụ tư vấn cho đối tác.",
                    RequiredFields = new() { "Tên đối tác / Khách hàng", "Mã số thuế", "Phạm vi công việc", "Giá trị hợp đồng", "Tiến độ thanh toán" }
                },
                new ContractTemplateDto
                {
                    Code = "NGHIEM_THU",
                    Name = "Biên bản bàn giao & Nghiệm thu hoàn thành",
                    Category = "Nghiệm thu",
                    Description = "Biên bản xác nhận khối lượng công việc hoàn thành và nghiệm thu chất lượng làm căn cứ thanh quyết toán.",
                    RequiredFields = new() { "Số hợp đồng căn cứ", "Đại diện bên giao", "Đại diện bên nhận", "Nội dung nghiệm thu", "Kết luận" }
                }
            };
            return Task.FromResult<IEnumerable<ContractTemplateDto>>(list);
        }

        private static string BuildContractHtml(
            string title,
            string contractNo,
            string companyName,
            string companyTax,
            string companyAddress,
            string partnerName,
            string partnerTaxCode,
            string partnerAddress,
            string representative,
            string position,
            decimal contractValue,
            DateTime signDate,
            DateTime? effectiveDate,
            DateTime? expireDate,
            string? details)
        {
            string formattedValue = $"{contractValue:N0} VNĐ";
            var sb = new StringBuilder();
            sb.AppendLine("<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>");
            sb.AppendLine("<head>");
            sb.AppendLine("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\">");
            sb.AppendLine("<meta name=\"ProgId\" content=\"Word.Document\">");
            sb.AppendLine("<meta name=\"Generator\" content=\"Microsoft Word 15\">");
            sb.AppendLine("<meta name=\"Originator\" content=\"Microsoft Word 15\">");
            sb.AppendLine("<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom><w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->");
            sb.AppendLine("<style>");
            sb.AppendLine("@page Section1 { size: 595.3pt 841.9pt; margin: 2.0cm 2.0cm 2.0cm 2.5cm; mso-header-margin: 36.0pt; mso-footer-margin: 36.0pt; mso-paper-source: 0; }");
            sb.AppendLine("div.Section1 { page: Section1; }");
            sb.AppendLine("body { font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif; font-size: 13.0pt; line-height: 1.5; color: #000000; text-align: justify; }");
            sb.AppendLine("h2 { text-align: center; font-size: 16.0pt; font-weight: bold; margin-top: 10pt; margin-bottom: 5pt; }");
            sb.AppendLine("h3 { font-size: 13.0pt; font-weight: bold; margin-top: 14pt; margin-bottom: 4pt; }");
            sb.AppendLine(".center { text-align: center; }");
            sb.AppendLine(".bold { font-weight: bold; }");
            sb.AppendLine(".tbl { width: 100%; border-collapse: collapse; margin-top: 25pt; }");
            sb.AppendLine(".tbl td { vertical-align: top; font-size: 13.0pt; }");
            sb.AppendLine("</style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("<div class='Section1'>");
            sb.AppendLine("<div class='center'>");
            sb.AppendLine("<span class='bold' style='font-size:12.5pt;'>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span><br>");
            sb.AppendLine("<span class='bold' style='font-size:13pt;'>Độc lập - Tự do - Hạnh phúc</span><br>");
            sb.AppendLine("------------------o0o------------------");
            sb.AppendLine("</div><br>");
            sb.AppendLine($"<h2>{title.ToUpperInvariant()}</h2>");
            sb.AppendLine($"<p class='center'><em>Số: {contractNo}</em></p>");
            sb.AppendLine($"<p class='center'><em>Hôm nay, ngày {signDate:dd} tháng {signDate:MM} năm {signDate:yyyy}, tại trụ sở {companyName}, chúng tôi gồm có:</em></p>");
            sb.AppendLine($"<h3>BÊN A: {companyName.ToUpperInvariant()}</h3>");
            sb.AppendLine($"<p>- Mã số thuế: <strong>{companyTax}</strong><br>- Địa chỉ trụ sở: {companyAddress}<br>- Đại diện: Ông/Bà Người đại diện theo pháp luật - Chức vụ: Giám đốc</p>");
            sb.AppendLine($"<h3>BÊN B: {partnerName.ToUpperInvariant()}</h3>");
            sb.AppendLine($"<p>- Mã số thuế / Số CCCD: <strong>{partnerTaxCode}</strong><br>- Địa chỉ: {partnerAddress}<br>- Người đại diện: {representative} - Chức vụ: {position}</p>");
            sb.AppendLine("<h3>ĐIỀU 1: NỘI DUNG VÀ MỤC ĐÍCH HỢP ĐỒNG</h3>");
            sb.AppendLine($"<p>{(string.IsNullOrWhiteSpace(details) ? "Hai bên thống nhất ký kết thực hiện các điều khoản hợp đồng theo đúng quy định hiện hành của pháp luật và thỏa thuận hợp tác giữa hai bên." : details)}</p>");
            sb.AppendLine("<h3>ĐIỀU 2: GIÁ TRỊ VĂN BẢN VÀ PHƯƠNG THỨC THANH TOÁN</h3>");
            sb.AppendLine($"<p>- Tổng giá trị giao dịch: <strong>{formattedValue}</strong>.<br>- Hình thức thanh toán: Chuyển khoản qua tài khoản ngân hàng của Bên B.<br>- Thời hạn hiệu lực: Từ ngày {effectiveDate ?? signDate:dd/MM/yyyy} đến ngày {expireDate ?? signDate.AddMonths(12):dd/MM/yyyy}.</p>");
            sb.AppendLine("<h3>ĐIỀU 3: ĐIỀU KHOẢN CHUNG VÀ CAM KẾT</h3>");
            sb.AppendLine("<p>Hợp đồng này có hiệu lực kể từ ngày ký. Mọi sửa đổi, bổ sung phải được sự đồng ý bằng văn bản của cả hai bên. Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</p>");
            sb.AppendLine("<table class='tbl'><tr>");
            sb.AppendLine("<td style='text-align:center;width:50%;'><span class='bold'>ĐẠI DIỆN BÊN A</span><br><em>(Ký, ghi rõ họ tên và đóng dấu)</em><br><br><br><br><br></td>");
            sb.AppendLine("<td style='text-align:center;width:50%;'><span class='bold'>ĐẠI DIỆN BÊN B</span><br><em>(Ký, ghi rõ họ tên)</em><br><br><br><br><br></td>");
            sb.AppendLine("</tr></table>");
            sb.AppendLine("</div>");
            sb.AppendLine("</body></html>");
            return sb.ToString();
        }

        public Task<IEnumerable<ContractDocumentDto>> GetContractsAsync(int companyId)
        {
            lock (_contractsLock)
            {
                if (_contractsStore.Count == 0)
                {
                    // Seed initial samples
                    _contractsStore.Add(new ContractDocumentDto
                    {
                        Id = 1,
                        CompanyId = companyId > 0 ? companyId : 1,
                        ContractCode = "0106/HDTV/2026/THL-ZFUND",
                        Title = "Hợp đồng tư vấn kế toán & quản trị tháng 10/2026",
                        TemplateCode = "HD_KINH_TE",
                        TemplateName = "Hợp đồng dịch vụ",
                        Category = "Kinh doanh",
                        PartnerName = "CÔNG TY CỔ PHẦN THL CONSULTING",
                        PartnerTaxCode = "0111491628",
                        PartnerAddress = "Tầng 2, tòa nhà HHN01, số 47 đường Nguyễn Tuân, Phường Thanh Xuân, Hà Nội",
                        Representative = "Ông Lê Tuấn Hưng - Giám đốc",
                        ContractValue = 7560000m,
                        SignDate = new DateTime(2026, 6, 1),
                        EffectiveDate = new DateTime(2026, 6, 1),
                        ExpireDate = new DateTime(2026, 12, 31),
                        Status = "Signed",
                        ContentHtml = BuildContractHtml(
                            "Hợp đồng tư vấn kế toán & quản trị tháng 10/2026",
                            "0106/HDTV/2026/THL-ZFUND",
                            "CÔNG TY CỔ PHẦN ZFUND",
                            "0111154196",
                            "Tầng 2, tòa nhà HHN01, số 47 đường Nguyễn Tuân, Phường Thanh Xuân, Hà Nội",
                            "CÔNG TY CỔ PHẦN THL CONSULTING",
                            "0111491628",
                            "Tầng 2, tòa nhà HHN01, số 47 đường Nguyễn Tuân, Phường Thanh Xuân, Hà Nội",
                            "Ông Lê Tuấn Hưng",
                            "Giám đốc",
                            7560000m,
                            new DateTime(2026, 6, 1),
                            new DateTime(2026, 6, 1),
                            new DateTime(2026, 12, 31),
                            "Cung cấp gói dịch vụ soát xét chứng từ, lập báo cáo tài chính và tư vấn thuế theo kỳ kế toán."
                        ),
                        FileName = "HopDong_0106_THL_ZFUND.doc",
                        CreatedAt = DateTime.Now
                    });

                    _contractsStore.Add(new ContractDocumentDto
                    {
                        Id = 2,
                        CompanyId = companyId > 0 ? companyId : 1,
                        ContractCode = "0710/2026/VV-HDNT-ZFUND-SPARKON",
                        Title = "Hợp đồng vay vốn & tài trợ lưu động ZFUND - SPARKON",
                        TemplateCode = "VAY_VON",
                        TemplateName = "Đề nghị vay vốn",
                        Category = "Ngân hàng",
                        PartnerName = "CÔNG TY CỔ PHẦN SPARKON",
                        PartnerTaxCode = "0109988776",
                        PartnerAddress = "Số 18 đường Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
                        Representative = "Bà Nguyễn Mai Phương - Tổng Giám đốc",
                        ContractValue = 156000000m,
                        SignDate = new DateTime(2026, 10, 7),
                        EffectiveDate = new DateTime(2026, 10, 7),
                        ExpireDate = new DateTime(2026, 11, 30),
                        Status = "Signed",
                        ContentHtml = BuildContractHtml(
                            "Hợp đồng vay vốn & tài trợ lưu động ZFUND - SPARKON",
                            "0710/2026/VV-HDNT-ZFUND-SPARKON",
                            "CÔNG TY CỔ PHẦN ZFUND",
                            "0111154196",
                            "Tầng 2, tòa nhà HHN01, số 47 đường Nguyễn Tuân, Phường Thanh Xuân, Hà Nội",
                            "CÔNG TY CỔ PHẦN SPARKON",
                            "0109988776",
                            "Số 18 đường Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội",
                            "Bà Nguyễn Mai Phương",
                            "Tổng Giám đốc",
                            156000000m,
                            new DateTime(2026, 10, 7),
                            new DateTime(2026, 10, 7),
                            new DateTime(2026, 11, 30),
                            "Hợp đồng tài trợ vốn lưu động bổ sung nguồn vốn kinh doanh ngắn hạn. Lãi suất và tiến độ hoàn trả theo thỏa thuận chi tiết giữa hai bên."
                        ),
                        FileName = "HopDongVay_0710_SPARKON.doc",
                        CreatedAt = DateTime.Now
                    });
                }

                var res = _contractsStore.Where(c => companyId == 0 || c.CompanyId == companyId).OrderByDescending(c => c.Id).ToList();
                return Task.FromResult<IEnumerable<ContractDocumentDto>>(res);
            }
        }

        public async Task<ContractDocumentDto> GenerateContractAsync(GenerateContractRequest request)
        {
            var comp = await _companyRepo.GetByIdAsync(request.CompanyId);
            string companyName = comp?.CompanyName ?? "CÔNG TY CỔ PHẦN ZFUND";
            string companyTax = comp?.TaxCode ?? "0111154196";
            string companyAddress = comp?.CompanyAddress ?? "Tầng 2, tòa HHN01, số 47 Nguyễn Tuân, Phường Thanh Xuân, Hà Nội";

            var templates = await GetContractTemplatesAsync();
            var tmpl = templates.FirstOrDefault(t => t.Code.Equals(request.TemplateCode, StringComparison.OrdinalIgnoreCase));

            string code = string.IsNullOrWhiteSpace(request.TemplateCode) ? "HD" : request.TemplateCode.ToUpperInvariant();
            string contractNo = $"{DateTime.Now:MMdd}/{DateTime.Now:yyyy}/{code}-{comp?.TaxCode ?? "AMIS"}";

            string title = string.IsNullOrWhiteSpace(request.Title) ? $"Hợp đồng {code} - {request.PartnerName}" : request.Title;

            string html = BuildContractHtml(
                title,
                contractNo,
                companyName,
                companyTax,
                companyAddress,
                request.PartnerName,
                request.PartnerTaxCode,
                request.PartnerAddress,
                request.Representative,
                request.Position,
                request.ContractValue,
                request.SignDate,
                request.EffectiveDate,
                request.ExpireDate,
                request.Details
            );

            string fileName = $"HopDong_{code}_{DateTime.Now:yyyyMMdd_HHmmss}.doc";

            var doc = new ContractDocumentDto
            {
                CompanyId = request.CompanyId,
                ContractCode = contractNo,
                Title = title,
                TemplateCode = request.TemplateCode,
                TemplateName = tmpl?.Name ?? request.TemplateCode,
                Category = tmpl?.Category ?? "Hợp đồng",
                PartnerName = request.PartnerName,
                PartnerTaxCode = request.PartnerTaxCode,
                PartnerAddress = request.PartnerAddress,
                Representative = request.Representative,
                ContractValue = request.ContractValue,
                SignDate = request.SignDate,
                EffectiveDate = request.EffectiveDate ?? request.SignDate,
                ExpireDate = request.ExpireDate ?? request.SignDate.AddMonths(12),
                Status = "Draft",
                ContentHtml = html,
                FileName = fileName,
                CreatedAt = DateTime.Now
            };

            lock (_contractsLock)
            {
                doc.Id = _contractsStore.Count > 0 ? _contractsStore.Max(c => c.Id) + 1 : 1;
                _contractsStore.Insert(0, doc);
            }

            return doc;
        }

        public Task<bool> DeleteContractAsync(int contractId)
        {
            lock (_contractsLock)
            {
                var item = _contractsStore.FirstOrDefault(c => c.Id == contractId);
                if (item != null)
                {
                    _contractsStore.Remove(item);
                    return Task.FromResult(true);
                }
                return Task.FromResult(false);
            }
        }

        public async Task<(byte[] Bytes, string ContentType, string FileName)?> ExportContractDocumentAsync(int contractId)
        {
            ContractDocumentDto? doc;
            lock (_contractsLock)
            {
                doc = _contractsStore.FirstOrDefault(c => c.Id == contractId);
            }

            if (doc == null) return null;

            string htmlContent = doc.ContentHtml ?? "";
            if (string.IsNullOrWhiteSpace(htmlContent))
            {
                var comp = await _companyRepo.GetByIdAsync(doc.CompanyId);
                htmlContent = BuildContractHtml(
                    doc.Title,
                    doc.ContractCode,
                    comp?.CompanyName ?? "CÔNG TY CỔ PHẦN ZFUND",
                    comp?.TaxCode ?? "0111154196",
                    comp?.CompanyAddress ?? "Tầng 2, tòa nhà HHN01, số 47 đường Nguyễn Tuân, Phường Thanh Xuân, Hà Nội",
                    doc.PartnerName,
                    doc.PartnerTaxCode,
                    doc.PartnerAddress,
                    doc.Representative,
                    "Đại diện Bên B",
                    doc.ContractValue,
                    doc.SignDate,
                    doc.EffectiveDate,
                    doc.ExpireDate,
                    "Hai bên thống nhất ký kết hợp đồng và cam kết thực hiện đầy đủ các quyền và nghĩa vụ theo quy định của pháp luật."
                );
            }

            byte[] utf8Bytes = Encoding.UTF8.GetBytes(htmlContent);
            byte[] bom = Encoding.UTF8.GetPreamble(); // UTF-8 BOM: 0xEF, 0xBB, 0xBF
            byte[] finalBytes = new byte[bom.Length + utf8Bytes.Length];
            Buffer.BlockCopy(bom, 0, finalBytes, 0, bom.Length);
            Buffer.BlockCopy(utf8Bytes, 0, finalBytes, bom.Length, utf8Bytes.Length);

            return (finalBytes, "application/msword; charset=utf-8", doc.FileName ?? "HopDong.doc");
        }
    }
}
