using System.Collections.Generic;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;

namespace AmisAssistant.Server.Services.Taxation
{
    public class TaxationService : ITaxationService
    {
        public Task<IEnumerable<VatIndicatorDto>> GetVatIndicatorsAsync(int companyId, int month, int year)
        {
            var list = new List<VatIndicatorDto>
            {
                new VatIndicatorDto { Code = "[21]", Description = "Không phát sinh hoạt động mua, bán trong kỳ", Amount = 0, TaxAmount = 0, Note = "Chỉ tích nếu không phát sinh" },
                new VatIndicatorDto { Code = "[22]", Description = "Thuế GTGT còn được khấu trừ kỳ trước chuyển sang", Amount = 0, TaxAmount = 45200000, Note = "Chị tự điền theo tờ khai kỳ trước" },
                new VatIndicatorDto { Code = "[23]", Description = "Giá trị và thuế GTGT của HHDV mua vào", Amount = 56500000, TaxAmount = 5650000, Note = "Tổng giá trị chưa thuế mua vào" },
                new VatIndicatorDto { Code = "[24]", Description = "Thuế GTGT của HHDV mua vào", Amount = 0, TaxAmount = 5650000, Note = "Hóa đơn hợp lệ trong kỳ" },
                new VatIndicatorDto { Code = "[25]", Description = "Tổng số thuế GTGT được khấu trừ kỳ này", Amount = 0, TaxAmount = 5650000, Note = "Đủ điều kiện khấu trừ" },
                new VatIndicatorDto { Code = "[26]", Description = "HHDV bán ra không chịu thuế GTGT", Amount = 0, TaxAmount = 0, Note = "" },
                new VatIndicatorDto { Code = "[29]", Description = "HHDV bán ra chịu thuế suất 0%", Amount = 0, TaxAmount = 0, Note = "Xuất khẩu" },
                new VatIndicatorDto { Code = "[30]", Description = "HHDV bán ra chịu thuế suất 5%", Amount = 0, TaxAmount = 0, Note = "" },
                new VatIndicatorDto { Code = "[32]", Description = "HHDV bán ra chịu thuế suất 10%", Amount = 1001484224, TaxAmount = 100148422, Note = "Doanh số bán ra chịu thuế 10%" },
                new VatIndicatorDto { Code = "[33]", Description = "Tổng doanh thu và thuế GTGT bán ra", Amount = 1001484224, TaxAmount = 100148422, Note = "Doanh thu dịch vụ CNTT" },
                new VatIndicatorDto { Code = "[40]", Description = "Thuế GTGT phải nộp kỳ này", Amount = 0, TaxAmount = 49298422, Note = "[33] thuế - [25] thuế - [22]" },
                new VatIndicatorDto { Code = "[43]", Description = "Thuế GTGT còn được khấu trừ chuyển kỳ sau", Amount = 0, TaxAmount = 0, Note = "Chuyển sang chỉ tiêu [22] kỳ sau" }
            };
            return Task.FromResult<IEnumerable<VatIndicatorDto>>(list);
        }
    }
}
