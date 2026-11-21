using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.CustomerPortal
{
    public class CustomerPortalService : ICustomerPortalService
    {
        public Task<IEnumerable<CustomerDebtDto>> GetCustomerDebtsAsync(int companyId)
        {
            var debts = new List<CustomerDebtDto>
            {
                new CustomerDebtDto
                {
                    CustomerCode = "COROCHTI",
                    CustomerName = "CÔNG TY CỔ PHẦN COROCHTI",
                    TaxCode = "1201689310",
                    BeginningDebt = 0m,
                    IncreaseDebt = 10027397m,
                    DecreaseDebt = 0m,
                    EndingDebt = 10027397m,
                    UnpaidInvoiceCount = 2,
                    Status = "Trong hạn"
                },
                new CustomerDebtDto
                {
                    CustomerCode = "HAU_ND",
                    CustomerName = "Nguyễn Đức Hậu",
                    TaxCode = "031095002727",
                    BeginningDebt = 0m,
                    IncreaseDebt = 493151m,
                    DecreaseDebt = 0m,
                    EndingDebt = 493151m,
                    UnpaidInvoiceCount = 1,
                    Status = "Trong hạn"
                },
                new CustomerDebtDto
                {
                    CustomerCode = "DANG_CH",
                    CustomerName = "Chu Hải Đăng",
                    TaxCode = "001086046528",
                    BeginningDebt = 0m,
                    IncreaseDebt = 2454795m,
                    DecreaseDebt = 0m,
                    EndingDebt = 2454795m,
                    UnpaidInvoiceCount = 1,
                    Status = "Trong hạn"
                }
            };
            return Task.FromResult<IEnumerable<CustomerDebtDto>>(debts);
        }

        public Task<IEnumerable<InventoryItemDto>> GetInventoryItemsAsync(int companyId)
        {
            var items = new List<InventoryItemDto>
            {
                new InventoryItemDto
                {
                    ItemCode = "HQ9527",
                    ItemName = "Giày chạy HQ9527 cao cấp",
                    Unit = "Đôi",
                    Quantity = 10m,
                    UnitPrice = 2500000m,
                    TotalValue = 25000000m,
                    Warehouse = "Kho Tổng Hà Nội",
                    Status = "Sẵn sàng xuất kho"
                },
                new InventoryItemDto
                {
                    ItemCode = "920-013234",
                    ItemName = "Bàn phím cơ Logitech Pro X TKLRapid Gaming Analog Đen",
                    Unit = "Cái",
                    Quantity = 5m,
                    UnitPrice = 3239815m,
                    TotalValue = 16199075m,
                    Warehouse = "Kho Thiết bị IT",
                    Status = "Sẵn sàng xuất kho"
                },
                new InventoryItemDto
                {
                    ItemCode = "MSBAGM",
                    ItemName = "MS Túi đựng hàng tiêu chuẩn TB",
                    Unit = "Cái",
                    Quantity = 100m,
                    UnitPrice = 0m,
                    TotalValue = 0m,
                    Warehouse = "Kho Phụ liệu",
                    Status = "Sẵn sàng xuất kho"
                },
                new InventoryItemDto
                {
                    ItemCode = "DELL-U27",
                    ItemName = "Màn hình Dell UltraSharp 27 inch 4K UHD",
                    Unit = "Chiếc",
                    Quantity = 3m,
                    UnitPrice = 8500000m,
                    TotalValue = 25500000m,
                    Warehouse = "Kho CCDC Văn phòng",
                    Status = "Sẵn sàng sử dụng"
                }
            };
            return Task.FromResult<IEnumerable<InventoryItemDto>>(items);
        }

        public async Task<CustomerQueryResponse> ProcessCustomerQueryAsync(CustomerQueryRequest request)
        {
            string q = (request.Query ?? "").Trim().ToLowerInvariant();

            // 1. Tra cứu tồn kho
            if (q.Contains("tồn kho") || q.Contains("còn hàng") || q.Contains("sản phẩm") || q.Contains("bàn phím") || q.Contains("giày") || q.Contains("màn hình"))
            {
                var inventory = (await GetInventoryItemsAsync(request.CompanyId)).ToList();
                var matched = inventory.Where(i => 
                    q.Contains(i.ItemCode.ToLowerInvariant()) || 
                    q.Contains(i.ItemName.ToLowerInvariant()) ||
                    (q.Contains("bàn phím") && i.ItemName.Contains("bàn phím", StringComparison.OrdinalIgnoreCase)) ||
                    (q.Contains("giày") && i.ItemName.Contains("giày", StringComparison.OrdinalIgnoreCase)) ||
                    (q.Contains("màn hình") && i.ItemName.Contains("màn hình", StringComparison.OrdinalIgnoreCase))
                ).ToList();

                var listToReport = matched.Count > 0 ? matched : inventory;
                var sb = new StringBuilder();
                sb.AppendLine("Dạ chào bạn! Hệ thống kho hàng hiện tại đang có:");
                foreach (var item in listToReport)
                {
                    sb.AppendLine($"• [{item.ItemCode}] {item.ItemName}: Còn {item.Quantity} {item.Unit} (Giá: {item.UnitPrice:N0} đ/{item.Unit}) tại {item.Warehouse}.");
                }
                sb.AppendLine("Bạn có muốn đặt giữ hàng hay xuất hóa đơn cho mã nào không ạ?");

                return new CustomerQueryResponse
                {
                    Answer = sb.ToString(),
                    QueryType = "INVENTORY",
                    Data = listToReport
                };
            }

            // 2. Tra cứu công nợ
            if (q.Contains("công nợ") || q.Contains("còn nợ") || q.Contains("phải trả") || q.Contains("hóa đơn") || q.Contains("thanh toán"))
            {
                var debts = (await GetCustomerDebtsAsync(request.CompanyId)).ToList();
                var matched = debts.Where(d => 
                    q.Contains(d.CustomerCode.ToLowerInvariant()) || 
                    q.Contains(d.CustomerName.ToLowerInvariant()) ||
                    q.Contains(d.TaxCode)
                ).ToList();

                var listToReport = matched.Count > 0 ? matched : debts;
                var sb = new StringBuilder();
                sb.AppendLine("Dạ thông tin công nợ khách hàng trong kỳ như sau:");
                foreach (var d in listToReport)
                {
                    sb.AppendLine($"• Khách hàng: {d.CustomerName} (MST: {d.TaxCode}) - Dư nợ hiện tại: {d.EndingDebt:N0} VNĐ ({d.UnpaidInvoiceCount} hóa đơn chưa thanh toán - Trạng thái: {d.Status}).");
                }
                sb.AppendLine("Quý khách cần gửi lại file PDF hóa đơn hoặc bảng đối chiếu công nợ chi tiết xin vui lòng cho biết nhé!");

                return new CustomerQueryResponse
                {
                    Answer = sb.ToString(),
                    QueryType = "DEBT",
                    Data = listToReport
                };
            }

            // 3. Phản hồi chung
            return new CustomerQueryResponse
            {
                Answer = "Dạ chào quý khách! Tôi là Trợ lý Kế toán & Dịch vụ Khách hàng. Bạn có thể hỏi tôi về: Tình trạng tồn kho hàng hóa (\"còn bao nhiêu bàn phím Logitech?\"), Số dư công nợ (\"công nợ của Corochti là bao nhiêu?\"), hoặc kiểm tra tình trạng thanh toán hóa đơn.",
                QueryType = "GENERAL",
                Data = null
            };
        }
    }
}
