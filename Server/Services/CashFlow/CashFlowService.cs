using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AmisAssistant.Server.Models;
using AmisAssistant.Server.Services.Contracts;

namespace AmisAssistant.Server.Services.CashFlow
{
    public class CashFlowService : ICashFlowService
    {
        private readonly IContractsService _contractsService;
        private static readonly List<CashFlowPlanDto> _cashFlowStore = new();
        private static readonly object _cashFlowLock = new();

        public CashFlowService(IContractsService contractsService)
        {
            _contractsService = contractsService;
        }

        public Task<IEnumerable<CashFlowPlanDto>> GetCashFlowPlansAsync(int companyId, int month, int year)
        {
            lock (_cashFlowLock)
            {
                var existing = _cashFlowStore.Where(c => c.CompanyId == companyId && c.Month == month && c.Year == year).ToList();
                if (existing.Count > 0)
                {
                    return Task.FromResult<IEnumerable<CashFlowPlanDto>>(existing);
                }

                // Auto-generate realistic flow based on AMIS invoices and recurring expenses
                var initialItems = new List<CashFlowPlanDto>
                {
                    // DỰ THU
                    new CashFlowPlanDto
                    {
                        Id = 1,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Dự thu bán hàng & cung cấp dịch vụ trong kỳ (HĐ 87, 88, 89, 90)",
                        FlowType = "REVENUE",
                        Category = "Hóa đơn bán ra",
                        EstimatedAmount = 13000000m,
                        ActualAmount = 0m,
                        Source = "Báo cáo AMIS",
                        Status = "Approved",
                        ApprovedBy = "Ban Giám Đốc",
                        ApprovedAt = new DateTime(year, month, 1)
                    },
                    new CashFlowPlanDto
                    {
                        Id = 2,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Dự thu hồi nợ vay đối tác Sparkon theo kỳ hạn",
                        FlowType = "REVENUE",
                        Category = "Thu hồi nợ vay",
                        EstimatedAmount = 156000000m,
                        ActualAmount = 156000000m,
                        Source = "Hợp đồng số 0710",
                        Status = "Approved",
                        ApprovedBy = "Ban Giám Đốc",
                        ApprovedAt = new DateTime(year, month, 5)
                    },

                    // DỰ CHI
                    new CashFlowPlanDto
                    {
                        Id = 3,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Chi phí thuê hạ tầng máy chủ Amazon AWS & Google Cloud",
                        FlowType = "EXPENSE",
                        Category = "Server & Cloud",
                        EstimatedAmount = 218656m,
                        ActualAmount = 218656m,
                        Source = "Hóa đơn mua vào VPBank",
                        Status = "Approved",
                        ApprovedBy = "Sếp duyệt chi",
                        ApprovedAt = new DateTime(year, month, 2)
                    },
                    new CashFlowPlanDto
                    {
                        Id = 4,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Chi phí dịch vụ tư vấn THL Consulting theo hợp đồng",
                        FlowType = "EXPENSE",
                        Category = "Dịch vụ tư vấn",
                        EstimatedAmount = 7560000m,
                        ActualAmount = 0m,
                        Source = "Hóa đơn số 35 THL",
                        Status = "Pending",
                        Note = "Cần sếp duyệt chi để tiến hành thanh toán"
                    },
                    new CashFlowPlanDto
                    {
                        Id = 5,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Mua sắm bàn phím Logitech Pro X TKLRapid (Hacom)",
                        FlowType = "EXPENSE",
                        Category = "Công cụ dụng cụ",
                        EstimatedAmount = 3499000m,
                        ActualAmount = 0m,
                        Source = "Hóa đơn số 9129 Hacom",
                        Status = "Pending",
                        Note = "Thiết bị văn phòng phát sinh cho nhân viên kỹ thuật"
                    },
                    new CashFlowPlanDto
                    {
                        Id = 6,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Chi lương nhân sự và phụ cấp chuyên môn kỳ tháng 10",
                        FlowType = "EXPENSE",
                        Category = "Lương & Nhân sự",
                        EstimatedAmount = 45000000m,
                        ActualAmount = 0m,
                        Source = "Bảng lương phòng kế toán",
                        Status = "Pending",
                        Note = "Trình duyệt chi lương định kỳ trước ngày 05 hàng tháng"
                    },
                    new CashFlowPlanDto
                    {
                        Id = 7,
                        CompanyId = companyId,
                        Month = month,
                        Year = year,
                        Title = "Chi tiền thuê văn phòng trụ sở HHN01 Nguyễn Tuân",
                        FlowType = "EXPENSE",
                        Category = "Thuê văn phòng",
                        EstimatedAmount = 15000000m,
                        ActualAmount = 0m,
                        Source = "Chi phí định kỳ",
                        Status = "Approved",
                        ApprovedBy = "Sếp duyệt",
                        ApprovedAt = new DateTime(year, month, 1)
                    }
                };

                _cashFlowStore.AddRange(initialItems);
                return Task.FromResult<IEnumerable<CashFlowPlanDto>>(initialItems);
            }
        }

        public Task<CashFlowPlanDto> SaveCashFlowPlanAsync(CashFlowPlanDto dto)
        {
            lock (_cashFlowLock)
            {
                if (dto.Id > 0)
                {
                    var existing = _cashFlowStore.FirstOrDefault(c => c.Id == dto.Id);
                    if (existing != null)
                    {
                        existing.Title = dto.Title;
                        existing.FlowType = dto.FlowType;
                        existing.Category = dto.Category;
                        existing.EstimatedAmount = dto.EstimatedAmount;
                        existing.ActualAmount = dto.ActualAmount;
                        existing.Source = dto.Source;
                        existing.Status = dto.Status;
                        existing.Note = dto.Note;
                        return Task.FromResult(existing);
                    }
                }

                dto.Id = _cashFlowStore.Count > 0 ? _cashFlowStore.Max(c => c.Id) + 1 : 1;
                dto.Status = string.IsNullOrWhiteSpace(dto.Status) ? "Pending" : dto.Status;
                _cashFlowStore.Insert(0, dto);
                return Task.FromResult(dto);
            }
        }

        public Task<bool> DeleteCashFlowPlanAsync(int id)
        {
            lock (_cashFlowLock)
            {
                var item = _cashFlowStore.FirstOrDefault(c => c.Id == id);
                if (item != null)
                {
                    _cashFlowStore.Remove(item);
                    return Task.FromResult(true);
                }
                return Task.FromResult(false);
            }
        }

        public async Task<CashFlowPlanDto?> ApproveCashFlowPlanAsync(int id, ApproveCashFlowRequest request)
        {
            CashFlowPlanDto? item;
            lock (_cashFlowLock)
            {
                item = _cashFlowStore.FirstOrDefault(c => c.Id == id);
                if (item == null) return null;

                item.Status = request.Status;
                item.ApprovedBy = string.IsNullOrWhiteSpace(request.ApproverName) ? "Sếp đã duyệt" : request.ApproverName;
                item.ApprovedAt = DateTime.Now;
                if (!string.IsNullOrWhiteSpace(request.Note)) item.Note = request.Note;
            }

            // Tự động sinh hợp đồng / đề nghị thanh toán nếu được yêu cầu
            if (request.AutoGenerateContract && request.Status.Equals("Approved", StringComparison.OrdinalIgnoreCase))
            {
                string tmplCode = item.Category.Contains("Server", StringComparison.OrdinalIgnoreCase) || item.Category.Contains("Cloud", StringComparison.OrdinalIgnoreCase)
                    ? "THUE_SERVER"
                    : (item.Category.Contains("Lương", StringComparison.OrdinalIgnoreCase) ? "HDLD" : "HD_KINH_TE");

                var genReq = new GenerateContractRequest
                {
                    CompanyId = item.CompanyId,
                    TemplateCode = tmplCode,
                    Title = $"Hồ sơ phê duyệt chi & Hợp đồng: {item.Title}",
                    PartnerName = item.Category,
                    PartnerTaxCode = "THEO_DU_TOAN",
                    PartnerAddress = "Theo hồ sơ duyệt chi đính kèm",
                    Representative = "Bên thụ hưởng",
                    Position = "Đại diện",
                    ContractValue = item.EstimatedAmount,
                    SignDate = DateTime.Now,
                    Details = $"Khoản chi đã được {item.ApprovedBy} phê duyệt ngày {DateTime.Now:dd/MM/yyyy HH:mm}. Mục đích: {item.Title}. Nguồn dữ liệu: {item.Source}."
                };

                var contract = await _contractsService.GenerateContractAsync(genReq);
                item.GeneratedContractId = contract.Id;
                item.ContractCode = contract.ContractCode;
            }

            return item;
        }
    }
}
