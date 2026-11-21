import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorHouse,
  phosphorBank,
  phosphorMoney,
  phosphorShoppingCart,
  phosphorTag,
  phosphorReceipt,
  phosphorArchive,
  phosphorWrench,
  phosphorBuildings,
  phosphorUsers,
  phosphorFileText,
  phosphorChartLine,
  phosphorListBullets,
  phosphorScroll,
  phosphorPlay,
  phosphorGear,
  phosphorFolder,
  phosphorCheckCircle,
  phosphorWarningCircle,
  phosphorInfo,
  phosphorPlus,
  phosphorTrash,
  phosphorPencilSimple,
  phosphorMagnifyingGlass,
  phosphorArrowsClockwise,
  phosphorArrowDownLeft,
  phosphorArrowUpRight,
  phosphorCaretDown,
  phosphorFileArrowUp,
  phosphorDownloadSimple,
  phosphorCopy,
  phosphorDesktop,
  phosphorWindowsLogo,
  phosphorX
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../services/accounting.service';
import {
  AccountingRule,
  BankTransaction,
  BankAccount,
  Company,
  GeneratedFile,
  Invoice,
  CcdcItem,
  VatIndicator,
  Partner,
  GenerateContractRequest,
  ContractDocument,
  CashFlowPlan,
  CustomerDebt,
  InventoryItem
} from '../../models/accounting.model';
import { OverviewTabComponent } from '../tabs/overview/overview-tab.component';
import { BankingTabComponent } from '../tabs/banking/banking-tab.component';
import { DocumentsTabComponent } from '../tabs/documents/documents-tab.component';
import { CashFlowTabComponent } from '../tabs/cash-flow/cash-flow-tab.component';
import { CustomerPortalTabComponent } from '../tabs/customer-portal/customer-portal-tab.component';
import { PurchasesTabComponent } from '../tabs/purchases/purchases-tab.component';
import { SalesTabComponent } from '../tabs/sales/sales-tab.component';
import { ToolsSuppliesTabComponent } from '../tabs/tools-supplies/tools-supplies-tab.component';
import { VatTaxTabComponent } from '../tabs/vat-tax/vat-tax-tab.component';
import { MasterDataTabComponent } from '../tabs/master-data/master-data-tab.component';
import { AuditLogsTabComponent } from '../tabs/audit-logs/audit-logs-tab.component';
import { PlaceholderTabComponent } from '../tabs/placeholder/placeholder-tab.component';
import { LinkDataTabComponent } from '../tabs/link-data/link-data-tab.component';

export type NavModule =
  | 'tong-quan'
  | 'tien-mat'
  | 'tien-gui'
  | 'mua-hang'
  | 'ban-hang'
  | 'hoa-don'
  | 'soan-thao'
  | 'du-kien-thu-chi'
  | 'khach-hang'
  | 'kho'
  | 'ccdc'
  | 'tscd'
  | 'luong'
  | 'thue'
  | 'bao-cao'
  | 'link-data'
  | 'danh-muc'
  | 'nhat-ky';

@Component({
  selector: 'app-accounting-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIcon,
    OverviewTabComponent,
    BankingTabComponent,
    DocumentsTabComponent,
    CashFlowTabComponent,
    CustomerPortalTabComponent,
    PurchasesTabComponent,
    SalesTabComponent,
    ToolsSuppliesTabComponent,
    VatTaxTabComponent,
    MasterDataTabComponent,
    AuditLogsTabComponent,
    PlaceholderTabComponent,
    LinkDataTabComponent
  ],
  templateUrl: './accounting-dashboard.component.html',
  styleUrl: './accounting-dashboard.component.scss'
})
export class AccountingDashboardComponent implements OnInit {
  protected readonly svc = inject(AccountingService);

  // Phosphor Icons
  protected readonly houseIcon = phosphorHouse;
  protected readonly bankIcon = phosphorBank;
  protected readonly moneyIcon = phosphorMoney;
  protected readonly cartIcon = phosphorShoppingCart;
  protected readonly tagIcon = phosphorTag;
  protected readonly receiptIcon = phosphorReceipt;
  protected readonly archiveIcon = phosphorArchive;
  protected readonly wrenchIcon = phosphorWrench;
  protected readonly buildingsIcon = phosphorBuildings;
  protected readonly usersIcon = phosphorUsers;
  protected readonly fileTextIcon = phosphorFileText;
  protected readonly chartLineIcon = phosphorChartLine;
  protected readonly listIcon = phosphorListBullets;
  protected readonly scrollIcon = phosphorScroll;
  protected readonly playIcon = phosphorPlay;
  protected readonly gearIcon = phosphorGear;
  protected readonly folderIcon = phosphorFolder;
  protected readonly checkCircleIcon = phosphorCheckCircle;
  protected readonly warningIcon = phosphorWarningCircle;
  protected readonly infoIcon = phosphorInfo;
  protected readonly plusIcon = phosphorPlus;
  protected readonly trashIcon = phosphorTrash;
  protected readonly editIcon = phosphorPencilSimple;
  protected readonly searchIcon = phosphorMagnifyingGlass;
  protected readonly syncIcon = phosphorArrowsClockwise;
  protected readonly inIcon = phosphorArrowDownLeft;
  protected readonly outIcon = phosphorArrowUpRight;
  protected readonly caretIcon = phosphorCaretDown;
  protected readonly exportIcon = phosphorFileArrowUp;
  protected readonly downloadIcon = phosphorDownloadSimple;
  protected readonly copyIcon = phosphorCopy;
  protected readonly closeIcon = phosphorX;
  protected readonly desktopIcon = phosphorDesktop;
  protected readonly windowsIcon = phosphorWindowsLogo;
  protected readonly downloadSimpleIcon = phosphorDownloadSimple;

  protected isDownloadModalOpen = signal<boolean>(false);
  protected isUploadModalOpen = signal<boolean>(false);
  protected uploadFileCount = signal<number>(0);

  // Cấu hình thư mục lưu tệp tải về & mở Explorer
  protected isFolderPromptModalOpen = signal<boolean>(false);
  protected isFolderConfigModalOpen = signal<boolean>(false);
  protected targetDownloadFolder = signal<string>('');
  protected autoSavePreference = signal<boolean>(false);
  protected openExplorerAfterDownload = signal<boolean>(true);
  protected pendingDownloadBlob = signal<{ blob: Blob; fileName: string } | null>(null);
  protected suggestedResultsFolder = signal<string>('');
  protected suggestedDownloadsFolder = signal<string>('');
  protected suggestedDesktopFolder = signal<string>('');
  protected isBrowsingFolder = signal<boolean>(false);
  protected isSavingDownload = signal<boolean>(false);

  // Navigation Groups with structured categories
  protected readonly navGroups: {
    title: string;
    items: { id: NavModule; label: string; sub: string; icon: any; badge?: string }[];
  }[] = [
    {
      title: 'TỔNG QUAN',
      items: [
        { id: 'tong-quan', label: 'Tổng quan', sub: 'Tình hình chung của kỳ kế toán', icon: phosphorHouse }
      ]
    },
    {
      title: 'NGHIỆP VỤ PHÁT SINH',
      items: [
        { id: 'tien-mat', label: 'Tiền mặt', sub: 'Quỹ tiền mặt – thu chi tiền mặt', icon: phosphorMoney },
        { id: 'tien-gui', label: 'Tiền gửi', sub: 'Sao kê ngân hàng – phiếu thu, chi, chuyển tiền', icon: phosphorBank, badge: '3 cần rà' },
        { id: 'mua-hang', label: 'Mua hàng', sub: 'Bảng kê mua vào – chứng từ mua dịch vụ', icon: phosphorShoppingCart },
        { id: 'ban-hang', label: 'Bán hàng', sub: 'Bảng kê bán ra – chứng từ ghi nhận doanh thu', icon: phosphorTag },
        { id: 'soan-thao', label: 'Soạn thảo văn bản', sub: 'Sinh tự động HĐLĐ, Vay vốn, Thuê OS, HĐ đầu ra', icon: phosphorFileText },
        { id: 'du-kien-thu-chi', label: 'Dự kiến thu chi', sub: 'Báo cáo AMIS – Trình duyệt & sinh hợp đồng', icon: phosphorChartLine },
        { id: 'kho', label: 'Kho', sub: 'Nhập – xuất – tồn kho', icon: phosphorArchive },
        { id: 'ccdc', label: 'Công cụ dụng cụ', sub: 'Ghi tăng và phân bổ CCDC', icon: phosphorWrench },
        { id: 'tscd', label: 'Tài sản cố định', sub: 'Ghi tăng và khấu hao TSCĐ', icon: phosphorBuildings },
        { id: 'luong', label: 'Tiền lương', sub: 'Bảng lương – chứng từ nghiệp vụ khác', icon: phosphorUsers }
      ]
    },
    {
      title: 'KHÁCH HÀNG & DỊCH VỤ',
      items: [
        { id: 'khach-hang', label: 'Cổng Khách hàng', sub: 'Tra cứu Tồn kho, Công nợ & Hỏi đáp AI', icon: phosphorUsers }
      ]
    },
    {
      title: 'BÁO CÁO & LINK DATA',
      items: [
        { id: 'link-data', label: 'Link Data', sub: 'Báo cáo MISA AMIS & Dữ liệu đồng bộ trực tiếp', icon: phosphorArrowsClockwise, badge: 'Live MISA' },
        { id: 'thue', label: 'Thuế GTGT', sub: 'Bảng kê VAT và số liệu tờ khai', icon: phosphorFileText },
        { id: 'bao-cao', label: 'Báo cáo', sub: 'Báo cáo tháng gửi khách hàng', icon: phosphorChartLine }
      ]
    },
    {
      title: 'HỆ THỐNG',
      items: [
        { id: 'danh-muc', label: 'Danh mục', sub: 'Đối tượng khách hàng, NCC, nhân viên', icon: phosphorListBullets },
        { id: 'nhat-ky', label: 'Nhật ký', sub: 'Toàn bộ quá trình chạy', icon: phosphorScroll }
      ]
    }
  ];

  protected get navItems() {
    return this.navGroups.flatMap(g => g.items);
  }

  // Active module
  protected activeModule = signal<NavModule>('tong-quan');

  // Period
  protected isAutoPeriod = signal<boolean>(true);
  protected selectedMonth = signal<number>(10);
  protected selectedYear = signal<number>(2026);
  protected readonly months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  protected readonly years = [2024, 2025, 2026, 2027];

  protected onMonthChange(m: number): void {
    this.selectedMonth.set(m);
    this.svc.selectedMonth.set(m);
    this.reloadPeriodData();
  }

  protected onYearChange(y: number): void {
    this.selectedYear.set(y);
    this.svc.selectedYear.set(y);
    this.reloadPeriodData();
  }

  protected reloadPeriodData(): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    const m = this.selectedMonth();
    const y = this.selectedYear();
    this.svc.loadGeneratedFiles(comp.id, m, y).subscribe();
    this.svc.loadInvoices(comp.id, this.activeModule() === 'ban-hang' ? 'OUT' : 'IN', m, y).subscribe();
    this.svc.loadCcdc(comp.id, m, y).subscribe();
    this.svc.loadVatReport(comp.id, m, y).subscribe();
    this.svc.loadLogs(comp.id, m, y).subscribe();
  }

  // Tiền gửi filter & state
  protected bankFilter = signal<string>('ALL');
  protected statusFilter = signal<string>('ALL');
  protected showAllVouchers = signal<boolean>(true);
  protected selectedTransaction = signal<BankTransaction | null>(null);

  // Khai mã đối tác alias
  protected aliasPartnerCode = signal<string>('');
  protected aliasNoticeMessage = signal<string>('');
  protected aliasNoticeType = signal<'success' | 'error' | 'info'>('info');

  // Modals & Forms State
  protected isSidebarCollapsed = signal<boolean>(false);
  protected isCompanyModalOpen = signal<boolean>(false);
  protected isCompanyFormOpen = signal<boolean>(false);
  protected isSaving = signal<boolean>(false);

  // Dedicated Form Data Models for reliable 2-way binding
  protected companyFormData: Partial<Company> = {
    companyName: '',
    taxCode: '',
    dataFolder: 'D:\\2026\\1.Work\\9.PHUONG\\5. DU LIEU',
    rulesPath: '',
    fiscalYear: 2026,
    autoFindPartner: true
  };

  // Partner Modal
  protected isPartnerModalOpen = signal<boolean>(false);
  protected partnerSearchTerm = signal<string>('');
  protected partnerTypeFilter = signal<'ALL' | 'KH' | 'NCC' | 'NV'>('ALL');
  protected partnerFormData: Partial<Partner> = {
    partnerCode: '',
    partnerName: '',
    taxCode: '',
    partnerType: 'KH',
    defaultDebitAccount: '131',
    defaultCreditAccount: '511'
  };

  // Bank Account Modal
  protected isBankAccountModalOpen = signal<boolean>(false);
  protected bankAccountFormData: Partial<BankAccount> = {
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountName: '',
    glAccount: '1121',
    voucherPrefixReceipt: 'PTNH',
    voucherPrefixPayment: 'PCNH',
    initialBalance: 0,
    isActive: true
  };

  // Transaction Edit Modal
  protected isTransactionModalOpen = signal<boolean>(false);
  protected transactionFormData: Partial<BankTransaction> = {
    direction: 'OUT',
    amount: 0,
    transactionDate: new Date().toISOString().substring(0, 10),
    description: '',
    partnerCode: '',
    debitAccount: '6427',
    creditAccount: '1121',
    status: 'Matched'
  };

  // Invoice Modal
  protected isInvoiceModalOpen = signal<boolean>(false);
  protected invoiceFormData: Partial<Invoice> = {
    invoiceNo: '',
    invoiceDate: new Date().toISOString().substring(0, 10),
    partnerCode: '',
    partnerName: '',
    taxCode: '',
    preTaxAmount: 0,
    taxAmount: 0,
    totalAmount: 0,
    debitAccount: '1561',
    creditAccount: '331',
    invoiceType: 'IN',
    status: 'Approved'
  };

  // CCDC Modal
  protected isCcdcModalOpen = signal<boolean>(false);
  protected ccdcFormData: Partial<CcdcItem> = {
    code: '',
    name: '',
    originalPrice: 0,
    allocationPeriods: 12,
    invoiceRef: '',
    unit: 'Cái'
  };

  protected isRulesModalOpen = signal<boolean>(false);
  protected ruleSearchTerm = signal<string>('');
  protected ruleFormData: Partial<AccountingRule> = {
    ruleName: '',
    keywords: '',
    transactionDirection: 'ALL',
    debitAccount: '6427',
    creditAccount: '1121',
    priority: 10,
    isActive: true,
    ruleType: 'STANDARD',
    partnerCode: ''
  };
  protected isEditRuleSubModalOpen = signal<boolean>(false);

  // File Preview Modal
  protected previewFile = signal<GeneratedFile | null>(null);

  // Notification Toast
  protected toastMessage = signal<string>('');

  constructor() {
    effect(() => {
      const msg = this.svc.toastNotification();
      if (msg) {
        this.showToast(msg);
      }
    });
  }

  ngOnInit(): void {
    const initSettings = this.svc.getDownloadFolderSettings();
    this.targetDownloadFolder.set(initSettings.folderPath);
    this.autoSavePreference.set(initSettings.autoSave);
    this.openExplorerAfterDownload.set(initSettings.openExplorerAfterDownload ?? true);

    this.svc.loadCompanies().subscribe({
      next: () => {
        // Pre-select first transaction if available
        if (this.svc.transactions().length > 0) {
          this.selectedTransaction.set(this.svc.transactions()[0]);
        }
      }
    });
  }

  // Navigation
  protected selectModule(id: NavModule): void {
    this.activeModule.set(id);
    const comp = this.svc.selectedCompany();
    if (!comp) return;

    if (id === 'hoa-don' || id === 'mua-hang') {
      this.svc.loadInvoices(comp.id, 'IN', this.selectedMonth(), this.selectedYear()).subscribe();
    } else if (id === 'ban-hang') {
      this.svc.loadInvoices(comp.id, 'OUT', this.selectedMonth(), this.selectedYear()).subscribe();
    } else if (id === 'soan-thao') {
      this.svc.loadContractTemplates().subscribe();
      this.svc.loadContracts(comp.id).subscribe();
    } else if (id === 'du-kien-thu-chi') {
      this.svc.loadCashFlowPlans(comp.id, this.selectedMonth(), this.selectedYear()).subscribe();
    } else if (id === 'khach-hang') {
      this.svc.loadCustomerDebts(comp.id).subscribe();
      this.svc.loadInventory(comp.id).subscribe();
    } else if (id === 'ccdc') {
      this.svc.loadCcdc(comp.id, this.selectedMonth(), this.selectedYear()).subscribe();
    } else if (id === 'danh-muc') {
      this.svc.loadPartners(comp.id).subscribe();
    } else if (id === 'tien-gui') {
      this.svc.loadBankAccounts(comp.id).subscribe();
      this.svc.loadTransactions(comp.id).subscribe();
    } else if (id === 'nhat-ky') {
      this.svc.loadLogs(comp.id, this.selectedMonth(), this.selectedYear()).subscribe();
    }
  }

  protected getCurrentNav() {
    return this.navItems.find(n => n.id === this.activeModule()) ?? this.navItems[0];
  }

  // Company Switcher
  protected onCompanyChange(companyId: any): void {
    const id = Number(companyId);
    const comp = this.svc.companies().find(c => c.id === id);
    if (comp) {
      this.svc.selectCompany(comp);
      this.showToast(`Đã chuyển sang công ty: ${comp.companyName}`);
    }
  }

  // Primary Action: ▶ LẬP FILE
  protected onRunEngine(): void {
    const comp = this.svc.selectedCompany();
    if (!comp) {
      alert('Vui lòng chọn một công ty trước khi lập file!');
      return;
    }

    // Nếu đang truy cập qua Web từ xa (VPS 103.107.183.86) -> Mở hộp thoại chọn thư mục dữ liệu trên máy tính
    if (this.svc.isRemoteHost) {
      this.isUploadModalOpen.set(true);
      return;
    }

    // Nếu đang chạy trực tiếp trên máy (Desktop App hoặc Localhost) -> Chạy trực tiếp trên ổ D
    this.runDirectEngine(comp.id, this.selectedMonth(), this.selectedYear());
  }

  protected runDirectEngine(companyId: number, month: number, year: number): void {
    this.svc.runEngine(companyId, month, year).subscribe({
      next: (res) => {
        if (res.success) {
          const count = res.files?.length || 0;
          this.showToast(res.message || `Lập file thành công! (${count} tệp AMIS)`);
          if (count === 0) {
            alert('Cảnh báo: Đã chạy công cụ nhưng không có tệp kết quả nào được tạo ra trong thư mục "4. UP PHAN MEM". Vui lòng kiểm tra lại sao kê và quy tắc.');
          }
          if (this.svc.transactions().length > 0 && !this.selectedTransaction()) {
            this.selectedTransaction.set(this.svc.transactions()[0]);
          }
        } else {
          alert(`LỖI KHI LẬP FILE AMIS:\n\n${res.message || 'Không thành công'}`);
          this.selectModule('tong-quan');
        }
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Lỗi kết nối máy chủ khi lập file.';
        alert(`LỖI KHI CHẠY LẬP FILE:\n${msg}`);
      }
    });
  }

  // Quét chọn thư mục máy tính qua File System Access API
  protected async onPickDirectoryAndRun(folderInput?: HTMLInputElement): Promise<void> {
    const comp = this.svc.selectedCompany();
    if (!comp) {
      alert('Vui lòng chọn một công ty trước!');
      return;
    }

    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const files = await this.svc.pickDirectoryFiles();
        if (files && files.length > 0) {
          this.uploadFileCount.set(files.length);
          this.executeWebUploadSession(comp.id, this.selectedMonth(), this.selectedYear(), files);
          return;
        }
        if (files && files.length === 0) {
          alert('Thư mục đã chọn không chứa tệp sao kê hoặc hóa đơn hợp lệ (.xlsx, .pdf, .xml).');
          return;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        console.warn('showDirectoryPicker fallback to input:', e);
      }
    }

    if (folderInput) {
      folderInput.click();
    }
  }

  protected onFolderFilesSelected(event: any): void {
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const comp = this.svc.selectedCompany();
    if (!comp) return;

    const files: { file: File; relPath: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (['.xlsx', '.xls', '.xml', '.pdf', '.csv'].includes(ext) && !f.name.startsWith('~$')) {
        files.push({ file: f, relPath: (f as any).webkitRelativePath || f.name });
      }
    }

    if (files.length === 0) {
      alert('Không tìm thấy tệp sao kê hoặc hóa đơn hợp lệ trong thư mục đã chọn.');
      return;
    }

    this.uploadFileCount.set(files.length);
    this.executeWebUploadSession(comp.id, this.selectedMonth(), this.selectedYear(), files);
  }

  protected onLooseFilesSelected(event: any): void {
    const fileList: FileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    const comp = this.svc.selectedCompany();
    if (!comp) return;

    const files: { file: File; relPath: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      if (['.xlsx', '.xls', '.xml', '.pdf', '.csv'].includes(ext) && !f.name.startsWith('~$')) {
        files.push({ file: f, relPath: f.name });
      }
    }

    if (files.length === 0) {
      alert('Vui lòng chọn ít nhất 1 tệp Excel (.xlsx).');
      return;
    }

    this.uploadFileCount.set(files.length);
    this.executeWebUploadSession(comp.id, this.selectedMonth(), this.selectedYear(), files);
  }

  private executeWebUploadSession(companyId: number, month: number, year: number, files: { file: File; relPath: string }[]): void {
    this.svc.executeSessionWithFiles(companyId, month, year, files).subscribe({
      next: (res) => {
        if (res.success) {
          const count = res.files?.length || 0;
          this.showToast(res.message || `Lập file thành công! (${count} tệp AMIS)`);
          this.selectModule('tong-quan');
        } else {
          alert(`LỖI KHI LẬP FILE AMIS:\n\n${res.message || 'Không thành công'}`);
        }
      },
      error: (err) => {
        const msg = err.error?.message || err.message || 'Lỗi khi tải dữ liệu lên phiên lập file.';
        alert(`LỖI KHI LẬP FILE:\n${msg}`);
      }
    });
  }

  // Transaction selection & filtering
  protected filteredTransactions = computed(() => {
    let list = this.svc.transactions();

    // Bank filter
    if (this.bankFilter() !== 'ALL') {
      list = list.filter(t => t.bankName.toLowerCase().includes(this.bankFilter().toLowerCase()));
    }

    // Status filter
    if (this.statusFilter() !== 'ALL') {
      list = list.filter(t => t.status === this.statusFilter());
    }

    // Only unconfirmed checkbox
    if (!this.showAllVouchers()) {
      list = list.filter(t => t.status === 'Unclassified' || (t.notes && t.notes.length > 0));
    }

    return list;
  });

  protected selectTransaction(t: BankTransaction): void {
    this.selectedTransaction.set(t);
    this.aliasPartnerCode.set(t.partnerCode === 'KR' || !t.partnerCode ? '' : t.partnerCode);
    this.aliasNoticeMessage.set('');
  }

  // Partner Code Assignment
  protected suggestNewPartnerCode(): void {
    const t = this.selectedTransaction();
    if (!t) return;

    let prefix = 'NCC';
    if (t.direction === 'IN') prefix = 'KH';
    if (t.debitAccount?.startsWith('334') || t.description.toLowerCase().includes('luong')) prefix = 'NV';

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const suggested = `${prefix}0${randomNum}`;
    this.aliasPartnerCode.set(suggested);
    this.aliasNoticeType.set('info');
    this.aliasNoticeMessage.set(`Đề xuất mã mới: ${suggested}. Bấm 'Lưu mã' để gán và tự động nhận diện.`);
  }

  protected savePartnerAlias(): void {
    const t = this.selectedTransaction();
    const comp = this.svc.selectedCompany();
    const code = this.aliasPartnerCode().trim();

    if (!t || !comp) return;
    if (!code) {
      this.aliasNoticeType.set('error');
      this.aliasNoticeMessage.set('Vui lòng nhập mã đối tượng trước khi lưu.');
      return;
    }

    const raw = (t.partnerNameRaw || t.description || '').trim();
    this.svc.savePartnerAlias(comp.id, raw, code, `Khai từ Web UI cho CT ${t.voucherNo || t.refNo}`).subscribe({
      next: res => {
        this.aliasNoticeType.set('success');
        this.aliasNoticeMessage.set(`Đã lưu mã ${code} cho "${raw}". Các tháng sau tự động nhận diện.`);
        this.showToast(`Đã gán mã ${code} cho đối tác`);
        // Update local object
        t.partnerCode = code;
        t.status = 'Matched';
      },
      error: () => {
        this.aliasNoticeType.set('error');
        this.aliasNoticeMessage.set('Lỗi khi lưu mã đối tượng.');
      }
    });
  }

  // Responsive Sidebar Toggle
  protected toggleSidebar(): void {
    this.isSidebarCollapsed.update(v => !v);
  }

  // Modals
  protected openCompanyModal(): void {
    const current = this.svc.selectedCompany();
    if (current) {
      this.companyFormData = { ...current };
    }
    this.isCompanyFormOpen.set(false);
    this.isCompanyModalOpen.set(true);
  }

  protected closeCompanyModal(): void {
    this.isCompanyModalOpen.set(false);
    this.isCompanyFormOpen.set(false);
  }

  protected openCreateCompany(): void {
    this.companyFormData = {
      companyName: '',
      taxCode: '',
      dataFolder: 'D:\\2026\\1.Work\\9.PHUONG\\5. DU LIEU',
      rulesPath: '',
      fiscalYear: 2026,
      autoFindPartner: true
    };
    this.isCompanyFormOpen.set(true);
  }

  protected openEditCompany(comp: Company): void {
    this.companyFormData = { ...comp };
    this.isCompanyFormOpen.set(true);
  }

  protected saveCompany(): void {
    const data = { ...this.companyFormData };
    if (!data.companyName?.trim()) {
      alert('Tên công ty không được để trống.');
      return;
    }
    if (!data.taxCode?.trim()) {
      alert('Mã số thuế không được để trống.');
      return;
    }

    this.isSaving.set(true);
    this.svc.saveCompany(data).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.isCompanyFormOpen.set(false);
        this.showToast('Đã lưu thông tin công ty thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Company Error:', err);
        alert('Lỗi khi lưu công ty: ' + (err.error?.message || err.message || 'Không thể kết nối máy chủ'));
      }
    });
  }

  protected deleteCompany(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa công ty này và toàn bộ dữ liệu cấu hình liên quan?')) return;
    this.svc.deleteCompany(id).subscribe({
      next: () => {
        this.showToast('Đã xóa công ty thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa công ty: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- Partner CRUD ---
  protected filteredPartners = computed(() => {
    let list = this.svc.partners();
    const type = this.partnerTypeFilter();
    if (type !== 'ALL') {
      list = list.filter(p => p.partnerType === type);
    }
    const term = this.partnerSearchTerm().toLowerCase().trim();
    if (term) {
      list = list.filter(p =>
        p.partnerName.toLowerCase().includes(term) ||
        p.partnerCode.toLowerCase().includes(term) ||
        (p.taxCode && p.taxCode.toLowerCase().includes(term))
      );
    }
    return list;
  });

  protected openCreatePartner(): void {
    const comp = this.svc.selectedCompany();
    const filter = this.partnerTypeFilter();
    this.partnerFormData = {
      companyId: comp?.id ?? 1,
      partnerCode: '',
      partnerName: '',
      taxCode: '',
      partnerType: filter === 'ALL' ? 'KH' : filter,
      defaultDebitAccount: '131',
      defaultCreditAccount: '511'
    };
    this.isPartnerModalOpen.set(true);
  }

  protected openEditPartner(partner: Partner): void {
    this.partnerFormData = { ...partner };
    this.isPartnerModalOpen.set(true);
  }

  protected savePartner(): void {
    const p = { ...this.partnerFormData };
    if (!p.partnerCode?.trim() || !p.partnerName?.trim()) {
      alert('Vui lòng nhập Mã đối tượng và Tên đối tượng.');
      return;
    }

    this.isSaving.set(true);
    this.svc.savePartner(p).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isPartnerModalOpen.set(false);
        this.showToast('Đã lưu đối tượng thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Partner Error:', err);
        alert('Lỗi khi lưu đối tượng: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deletePartner(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa đối tượng này?')) return;
    this.svc.deletePartner(id).subscribe({
      next: () => {
        this.showToast('Đã xóa đối tượng thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa đối tượng: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- Bank Account CRUD ---
  protected openCreateBankAccount(): void {
    const comp = this.svc.selectedCompany();
    this.bankAccountFormData = {
      companyId: comp?.id ?? 1,
      bankName: '',
      bankCode: '',
      accountNumber: '',
      accountName: comp?.companyName || '',
      glAccount: '1121',
      voucherPrefixReceipt: 'PTNH',
      voucherPrefixPayment: 'PCNH',
      initialBalance: 0,
      isActive: true
    };
    this.isBankAccountModalOpen.set(true);
  }

  protected openEditBankAccount(acc: BankAccount): void {
    this.bankAccountFormData = { ...acc };
    this.isBankAccountModalOpen.set(true);
  }

  protected saveBankAccount(): void {
    const acc = { ...this.bankAccountFormData };
    if (!acc.bankName?.trim() || !acc.accountNumber?.trim()) {
      alert('Vui lòng nhập Tên ngân hàng và Số tài khoản.');
      return;
    }

    this.isSaving.set(true);
    this.svc.saveBankAccount(acc).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isBankAccountModalOpen.set(false);
        this.showToast('Đã lưu tài khoản ngân hàng thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Bank Account Error:', err);
        alert('Lỗi khi lưu tài khoản ngân hàng: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deleteBankAccount(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này?')) return;
    this.svc.deleteBankAccount(id).subscribe({
      next: () => {
        this.showToast('Đã xóa tài khoản ngân hàng thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa tài khoản ngân hàng: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- Transaction CRUD ---
  protected openCreateTransaction(): void {
    const comp = this.svc.selectedCompany();
    const firstAcc = this.svc.bankAccounts()[0];
    this.transactionFormData = {
      bankAccountId: firstAcc?.id ?? 1,
      bankName: firstAcc?.bankName ?? 'MB Bank',
      accountNumber: firstAcc?.accountNumber ?? '',
      direction: 'OUT',
      amount: 0,
      transactionDate: new Date().toISOString().substring(0, 10),
      description: '',
      partnerCode: '',
      partnerName: '',
      debitAccount: '6427',
      creditAccount: '1121',
      status: 'Matched'
    };
    this.isTransactionModalOpen.set(true);
  }

  protected openEditTransaction(t: BankTransaction): void {
    this.transactionFormData = { ...t };
    this.isTransactionModalOpen.set(true);
  }

  protected saveTransaction(): void {
    const tx = { ...this.transactionFormData };
    if (!tx.amount || !tx.description) {
      alert('Vui lòng nhập Số tiền và Diễn giải giao dịch.');
      return;
    }

    this.isSaving.set(true);
    this.svc.saveTransaction(tx).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isTransactionModalOpen.set(false);
        this.showToast('Đã lưu giao dịch thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Transaction Error:', err);
        alert('Lỗi khi lưu giao dịch: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deleteTransaction(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
    this.svc.deleteTransaction(id).subscribe({
      next: () => {
        if (this.selectedTransaction()?.id === id) {
          this.selectedTransaction.set(null);
        }
        this.showToast('Đã xóa giao dịch thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa giao dịch: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- Invoice CRUD ---
  protected openCreateInvoice(type: 'IN' | 'OUT' = 'IN'): void {
    const comp = this.svc.selectedCompany();
    this.invoiceFormData = {
      invoiceNo: '',
      invoiceDate: new Date().toISOString().substring(0, 10),
      partnerCode: '',
      partnerName: '',
      taxCode: '',
      preTaxAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      debitAccount: type === 'IN' ? '1561' : '131',
      creditAccount: type === 'IN' ? '331' : '511',
      invoiceType: type,
      status: 'Approved'
    };
    this.isInvoiceModalOpen.set(true);
  }

  protected openEditInvoice(inv: Invoice): void {
    this.invoiceFormData = { ...inv };
    this.isInvoiceModalOpen.set(true);
  }

  protected saveInvoice(): void {
    const inv = { ...this.invoiceFormData };
    if (!inv.invoiceNo?.trim() || !inv.partnerName?.trim()) {
      alert('Vui lòng nhập Số hóa đơn và Tên đối tác.');
      return;
    }
    // Auto calculate total
    inv.totalAmount = (Number(inv.preTaxAmount) || 0) + (Number(inv.taxAmount) || 0);

    this.isSaving.set(true);
    this.svc.saveInvoice(inv).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isInvoiceModalOpen.set(false);
        this.showToast('Đã lưu hóa đơn thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Invoice Error:', err);
        alert('Lỗi khi lưu hóa đơn: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deleteInvoice(id: number, type: string = 'IN'): void {
    if (!confirm('Bạn có chắc muốn xóa hóa đơn này?')) return;
    this.svc.deleteInvoice(id, type).subscribe({
      next: () => {
        this.showToast('Đã xóa hóa đơn thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa hóa đơn: ' + (err.error?.message || err.message));
      }
    });
  }

  // --- CCDC CRUD ---
  protected openCreateCcdc(): void {
    this.ccdcFormData = {
      code: '',
      name: '',
      originalPrice: 0,
      allocationPeriods: 12,
      invoiceRef: '',
      unit: 'Cái'
    };
    this.isCcdcModalOpen.set(true);
  }

  protected openEditCcdc(item: CcdcItem): void {
    this.ccdcFormData = { ...item };
    this.isCcdcModalOpen.set(true);
  }

  protected saveCcdc(): void {
    const item = { ...this.ccdcFormData };
    if (!item.code?.trim() || !item.name?.trim()) {
      alert('Vui lòng nhập Mã CCDC và Tên CCDC.');
      return;
    }

    this.isSaving.set(true);
    this.svc.saveCcdc(item).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isCcdcModalOpen.set(false);
        this.showToast('Đã lưu CCDC thành công!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save CCDC Error:', err);
        alert('Lỗi khi lưu CCDC: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deleteCcdc(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa CCDC này?')) return;
    this.svc.deleteCcdc(id).subscribe({
      next: () => {
        this.showToast('Đã xóa CCDC thành công!');
      },
      error: (err) => {
        alert('Lỗi khi xóa CCDC: ' + (err.error?.message || err.message));
      }
    });
  }

  // Rules Modal
  protected openRulesModal(): void {
    this.isRulesModalOpen.set(true);
  }

  protected closeRulesModal(): void {
    this.isRulesModalOpen.set(false);
    this.isEditRuleSubModalOpen.set(false);
  }

  protected filteredRules = computed(() => {
    const term = this.ruleSearchTerm().toLowerCase().trim();
    if (!term) return this.svc.rules();
    return this.svc.rules().filter(
      r =>
        r.ruleName.toLowerCase().includes(term) ||
        r.keywords.toLowerCase().includes(term) ||
        r.debitAccount.includes(term) ||
        r.creditAccount.includes(term)
    );
  });

  protected openCreateRule(): void {
    const comp = this.svc.selectedCompany();
    this.ruleFormData = {
      companyId: comp?.id ?? (this.svc.companies().length > 0 ? this.svc.companies()[0].id : 1),
      ruleName: '',
      keywords: '',
      transactionDirection: 'ALL',
      debitAccount: '6427',
      creditAccount: '1121',
      priority: (this.svc.rules().length + 1) * 5,
      isActive: true,
      ruleType: 'STANDARD',
      partnerCode: ''
    };
    this.isEditRuleSubModalOpen.set(true);
  }

  protected openEditRule(rule: AccountingRule): void {
    this.ruleFormData = { ...rule };
    this.isEditRuleSubModalOpen.set(true);
  }

  protected saveRule(): void {
    const r = { ...this.ruleFormData };
    if (!r.ruleName?.trim() || !r.keywords?.trim()) {
      alert('Vui lòng điền tên quy tắc và từ khóa.');
      return;
    }

    this.isSaving.set(true);
    this.svc.saveRule(r).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.isEditRuleSubModalOpen.set(false);
        this.showToast('Đã lưu quy tắc hạch toán!');
      },
      error: (err) => {
        this.isSaving.set(false);
        console.error('Save Rule Error:', err);
        alert('Lỗi khi lưu quy tắc: ' + (err.error?.message || err.message));
      }
    });
  }

  protected deleteRule(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa quy tắc hạch toán này?')) return;
    this.svc.deleteRule(id).subscribe({
      next: () => {
        this.showToast('Đã xóa quy tắc hạch toán.');
      },
      error: (err) => {
        alert('Lỗi khi xóa quy tắc: ' + (err.error?.message || err.message));
      }
    });
  }

  // File Operations & Results (Native Blob Download - Không bao giờ bị chặn Popup)
  protected openFile(file: GeneratedFile): void {
    this.previewFile.set(file);
    const comp = this.svc.selectedCompany();
    if (comp) {
      const downloadUrl = file.downloadUrl || this.svc.getDownloadFileUrl(comp.id, file.fileName, this.selectedMonth(), this.selectedYear());
      this.downloadWithFolderChoice(downloadUrl, file.fileName);
    }
  }

  protected downloadCurrentPreviewFile(): void {
    const f = this.previewFile();
    const comp = this.svc.selectedCompany();
    if (f && comp) {
      const downloadUrl = f.downloadUrl || this.svc.getDownloadFileUrl(comp.id, f.fileName, this.selectedMonth(), this.selectedYear());
      this.downloadWithFolderChoice(downloadUrl, f.fileName);
    }
  }

  // ==========================================
  // QUẢN LÝ THƯ MỤC LƯU TỆP TẢI VỀ & MỞ EXPLORER
  // ==========================================
  protected openDownloadFolderConfigModal(): void {
    const settings = this.svc.getDownloadFolderSettings();
    this.targetDownloadFolder.set(settings.folderPath);
    this.autoSavePreference.set(settings.autoSave);
    this.openExplorerAfterDownload.set(settings.openExplorerAfterDownload ?? true);

    const comp = this.svc.selectedCompany();
    if (comp) {
      this.svc.getSuggestedFolder(comp.id, this.selectedMonth(), this.selectedYear()).subscribe({
        next: (sug) => {
          this.suggestedResultsFolder.set(sug.folderPath);
          this.suggestedDownloadsFolder.set(sug.downloadsFolder);
          this.suggestedDesktopFolder.set(sug.desktopFolder);
          if (!this.targetDownloadFolder()) {
            this.targetDownloadFolder.set(settings.folderPath || sug.folderPath || sug.downloadsFolder || '');
          }
        }
      });
    }
    this.isFolderConfigModalOpen.set(true);
  }

  protected saveDownloadFolderConfig(): void {
    const folder = this.targetDownloadFolder().trim();
    this.svc.saveDownloadFolderSettings({
      folderPath: folder,
      autoSave: this.autoSavePreference(),
      openExplorerAfterDownload: this.openExplorerAfterDownload()
    });
    this.isFolderConfigModalOpen.set(false);
    this.showToast('Đã lưu cấu hình thư mục tải về thành công!');
  }

  protected async browseFolderForDownload(): Promise<void> {
    this.isBrowsingFolder.set(true);
    try {
      const chosen = await this.svc.browseFolderNative(this.targetDownloadFolder());
      if (chosen) {
        this.targetDownloadFolder.set(chosen);
      }
    } finally {
      this.isBrowsingFolder.set(false);
    }
  }

  protected setQuickFolder(folder: string): void {
    if (folder) {
      this.targetDownloadFolder.set(folder);
    }
  }

  protected openCurrentConfiguredFolder(): void {
    const folder = this.targetDownloadFolder().trim();
    if (!folder) {
      this.showToast('Chưa có thư mục nào được chọn.');
      return;
    }

    if (this.svc.isRemoteHost && !this.svc.isLocalAgentConnected()) {
      alert(`[LƯU Ý KHI TRUY CẬP WEB TỪ XA]\n\nBạn đang mở trang web từ xa qua máy chủ VPS (${window.location.hostname}).\nVì chính sách bảo mật trình duyệt, trang web trên Internet không thể tự động mở cửa sổ File Explorer trên máy tính cá nhân của bạn.\n\n👉 Để mở thư mục:\n1. Mở thư mục 'Downloads' của máy tính bạn (các tệp tải về được lưu tại đây).\n2. Hoặc mở trực tiếp trang web chạy tại máy: http://localhost:9092 để hệ thống tự động mở cửa sổ File Explorer trực tiếp!`);
      return;
    }

    this.svc.openPathLocally(folder).subscribe({
      next: (ok) => {
        if (ok) this.showToast(`Đã mở thư mục: ${folder}`);
        else this.showToast(`Không thể mở thư mục: ${folder}`);
      }
    });
  }

  protected downloadWithFolderChoice(url: string, defaultFileName: string): void {
    const settings = this.svc.getDownloadFolderSettings();
    this.showToast(`Đang nén và chuẩn bị tệp ${defaultFileName}...`);

    this.svc.fetchBlob(url, defaultFileName).subscribe({
      next: ({ blob, filename }) => {
        const targetName = filename || defaultFileName;
        // Nếu đã có cấu hình và tick "Tự động lưu (không hỏi lại)"
        if (settings.autoSave && settings.folderPath && settings.folderPath.trim().length > 0) {
          this.svc.saveBlobToFolder(blob, targetName, settings.folderPath, settings.openExplorerAfterDownload).subscribe({
            next: (res) => {
              if (res.success) {
                this.showToast(`Đã lưu ${targetName} vào ${res.filePath || settings.folderPath} và mở thư mục!`);
              }
            }
          });
          return;
        }

        // Chưa có cấu hình hoặc muốn hỏi lại nơi lưu: Mở Modal
        this.pendingDownloadBlob.set({ blob, fileName: targetName });
        const comp = this.svc.selectedCompany();
        if (comp) {
          this.svc.getSuggestedFolder(comp.id, this.selectedMonth(), this.selectedYear()).subscribe({
            next: (sug) => {
              this.suggestedResultsFolder.set(sug.folderPath);
              this.suggestedDownloadsFolder.set(sug.downloadsFolder);
              this.suggestedDesktopFolder.set(sug.desktopFolder);
              if (!this.targetDownloadFolder()) {
                this.targetDownloadFolder.set(settings.folderPath || sug.folderPath || sug.downloadsFolder || '');
              }
            }
          });
        }
        this.targetDownloadFolder.set(settings.folderPath || this.suggestedResultsFolder() || '');
        this.autoSavePreference.set(settings.autoSave);
        this.openExplorerAfterDownload.set(settings.openExplorerAfterDownload ?? true);
        this.isFolderPromptModalOpen.set(true);
      },
      error: (err) => {
        console.warn('Lỗi fetchBlob:', err);
      }
    });
  }

  protected confirmDownloadSave(): void {
    const pending = this.pendingDownloadBlob();
    if (!pending) {
      this.isFolderPromptModalOpen.set(false);
      return;
    }
    const folder = this.targetDownloadFolder().trim();
    if (!folder) {
      this.showToast('Vui lòng chọn hoặc nhập thư mục lưu tệp!');
      return;
    }

    // Cập nhật cấu hình lưu nếu người dùng tick "Ghi nhớ"
    this.svc.saveDownloadFolderSettings({
      folderPath: folder,
      autoSave: this.autoSavePreference(),
      openExplorerAfterDownload: this.openExplorerAfterDownload()
    });

    this.isSavingDownload.set(true);
    this.svc.saveBlobToFolder(pending.blob, pending.fileName, folder, this.openExplorerAfterDownload()).subscribe({
      next: (res) => {
        this.isSavingDownload.set(false);
        this.isFolderPromptModalOpen.set(false);
        this.pendingDownloadBlob.set(null);
        if (res.success) {
          this.showToast(`Đã lưu tệp vào ${res.filePath || folder} và mở thư mục kết quả!`);
        }
      },
      error: () => {
        this.isSavingDownload.set(false);
        this.isFolderPromptModalOpen.set(false);
        this.pendingDownloadBlob.set(null);
      }
    });
  }

  protected downloadAllResultsZip(): void {
    const comp = this.svc.selectedCompany();
    if (!comp) {
      this.showToast('Vui lòng chọn công ty');
      return;
    }
    const zipUrl = this.svc.getDownloadResultsZipUrl(comp.id, this.selectedMonth(), this.selectedYear());
    this.downloadWithFolderChoice(zipUrl, `Ket_Qua_AMIS_Thang${String(this.selectedMonth()).padStart(2, '0')}_${this.selectedYear()}.zip`);
  }

  protected closeFilePreview(): void {
    this.previewFile.set(null);
  }

  protected openResultsFolder(): void {
    const comp = this.svc.selectedCompany();
    if (!comp) {
      this.showToast('Vui lòng chọn công ty');
      return;
    }
    const month = this.selectedMonth();
    const year = this.selectedYear();
    const settings = this.svc.getDownloadFolderSettings();

    // 1. Mở thư mục Explorer trên server / máy (nếu chạy local hoặc có SyncAgent)
    this.svc.openFolderOnHost(comp.id, month, year, settings.folderPath).subscribe({
      next: (res) => {
        if (res?.message) console.log(res.message);
      },
      error: (err) => {
        console.warn('Không thể mở Explorer trên server:', err);
      }
    });

    // 2. Kích hoạt tải gói ZIP theo luồng hỏi/chọn thư mục lưu & mở Explorer
    const zipUrl = this.svc.getDownloadResultsZipUrl(comp.id, month, year);
    this.downloadWithFolderChoice(zipUrl, `Ket_Qua_AMIS_Thang${String(month).padStart(2, '0')}_${year}.zip`);

    this.activeModule.set('tong-quan');
  }

  protected openNoteFile(): void {
    const comp = this.svc.selectedCompany();
    if (!comp) {
      this.showToast('Vui lòng chọn công ty');
      return;
    }
    const month = this.selectedMonth();
    const year = this.selectedYear();
    const noteUrl = this.svc.getDownloadNoteFileUrl(comp.id, month, year);
    this.downloadWithFolderChoice(noteUrl, `0. Ghi_chu_doi_chieu_T${String(month).padStart(2, '0')}.xlsx`);
    this.activeModule.set('tong-quan');
  }

  // Tải file PDF của hóa đơn gốc
  protected downloadInvoicePdf(inv: Invoice): void {
    const comp = this.svc.selectedCompany();
    if (!comp || !inv.pdfFileName) {
      this.showToast('Hóa đơn này không có file PDF đính kèm.');
      return;
    }
    const pdfUrl = this.svc.getInvoicePdfUrl(comp.id, inv.pdfFileName, inv.invoiceType, this.selectedMonth(), this.selectedYear());
    this.svc.downloadBlob(pdfUrl, inv.pdfFileName.endsWith('.pdf') ? inv.pdfFileName : `${inv.pdfFileName}.pdf`).subscribe();
    this.showToast(`Đang tải hóa đơn PDF: ${inv.pdfFileName}...`);
  }

  // ==========================================
  // Module 1: Soạn thảo văn bản & Hợp đồng tự động
  // ==========================================
  protected isContractModalOpen = signal<boolean>(false);
  protected contractFormData: GenerateContractRequest = {
    companyId: 0,
    templateCode: 'HDLD',
    title: '',
    partnerName: '',
    partnerTaxCode: '',
    partnerAddress: '',
    representative: '',
    position: 'Đại diện',
    contractValue: 0,
    signDate: new Date().toISOString().substring(0, 10),
    effectiveDate: new Date().toISOString().substring(0, 10),
    expireDate: new Date(Date.now() + 365*24*3600*1000).toISOString().substring(0, 10),
    details: ''
  };

  protected openContractModal(templateCode?: string, prefill?: Partial<GenerateContractRequest>): void {
    const comp = this.svc.selectedCompany();
    this.contractFormData = {
      companyId: comp?.id ?? 1,
      templateCode: templateCode || 'HD_KINH_TE',
      title: prefill?.title || '',
      partnerName: prefill?.partnerName || '',
      partnerTaxCode: prefill?.partnerTaxCode || '',
      partnerAddress: prefill?.partnerAddress || '',
      representative: prefill?.representative || '',
      position: prefill?.position || 'Đại diện',
      contractValue: prefill?.contractValue || 0,
      signDate: new Date().toISOString().substring(0, 10),
      effectiveDate: new Date().toISOString().substring(0, 10),
      expireDate: new Date(Date.now() + 365*24*3600*1000).toISOString().substring(0, 10),
      details: prefill?.details || '',
      cashFlowId: prefill?.cashFlowId
    };
    this.isContractModalOpen.set(true);
  }

  protected closeContractModal(): void {
    this.isContractModalOpen.set(false);
  }

  protected submitGenerateContract(): void {
    if (!this.contractFormData.partnerName.trim()) {
      alert('Vui lòng nhập Tên đối tác / Người lao động.');
      return;
    }
    const comp = this.svc.selectedCompany();
    this.contractFormData.companyId = comp?.id ?? 1;

    this.svc.generateContract(this.contractFormData).subscribe({
      next: (res) => {
        this.isContractModalOpen.set(false);
        this.showToast('Đã sinh hợp đồng thành công!');
        const downloadUrl = this.svc.getDownloadContractUrl(res.data.id);
        this.svc.downloadBlob(downloadUrl, res.data.fileName || 'HopDong.doc').subscribe();
      },
      error: (err) => {
        alert('Lỗi sinh hợp đồng: ' + (err.error?.message || err.message));
      }
    });
  }

  protected downloadContractDoc(contract: ContractDocument): void {
    const url = this.svc.getDownloadContractUrl(contract.id);
    this.svc.downloadBlob(url, contract.fileName || 'HopDong.doc').subscribe();
    this.showToast(`Đang tải tệp hợp đồng ${contract.contractCode}...`);
  }

  protected deleteContractDoc(id: number): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    if (!confirm('Bạn có chắc muốn xóa tài liệu này?')) return;
    this.svc.deleteContract(id, comp.id).subscribe({
      next: () => this.showToast('Đã xóa hợp đồng.')
    });
  }

  // ==========================================
  // Module 2: Dự kiến thu chi & Phê duyệt chi
  // ==========================================
  protected isCashFlowModalOpen = signal<boolean>(false);
  protected cashFlowFilter = signal<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');
  protected totalEstimatedRevenue = computed(() =>
    this.svc.cashFlowPlans().filter(x => x.flowType === 'REVENUE').reduce((sum, x) => sum + x.estimatedAmount, 0)
  );
  protected totalEstimatedExpense = computed(() =>
    this.svc.cashFlowPlans().filter(x => x.flowType === 'EXPENSE').reduce((sum, x) => sum + x.estimatedAmount, 0)
  );
  protected netEstimatedCashFlow = computed(() =>
    this.totalEstimatedRevenue() - this.totalEstimatedExpense()
  );
  protected pendingCashFlowCount = computed(() =>
    this.svc.cashFlowPlans().filter(x => x.status === 'Pending').length
  );
  protected filteredCashFlowPlans = computed(() => {
    const filter = this.cashFlowFilter();
    const plans = this.svc.cashFlowPlans();
    if (filter === 'ALL') return plans;
    return plans.filter(p => p.status === filter);
  });
  protected cashFlowFormData: Partial<CashFlowPlan> = {
    title: '',
    flowType: 'EXPENSE',
    category: 'Phát sinh mới',
    estimatedAmount: 0,
    source: 'Phát sinh mới',
    note: ''
  };

  protected openCashFlowModal(): void {
    this.cashFlowFormData = {
      title: '',
      flowType: 'EXPENSE',
      category: 'Phát sinh mới',
      estimatedAmount: 0,
      source: 'Phát sinh mới',
      note: ''
    };
    this.isCashFlowModalOpen.set(true);
  }

  protected closeCashFlowModal(): void {
    this.isCashFlowModalOpen.set(false);
  }

  protected saveCashFlowItem(): void {
    if (!this.cashFlowFormData.title?.trim() || !this.cashFlowFormData.estimatedAmount) {
      alert('Vui lòng nhập tên khoản thu/chi và số tiền dự kiến.');
      return;
    }
    const comp = this.svc.selectedCompany();
    if (!comp) return;

    this.svc.saveCashFlowPlan(comp.id, {
      ...this.cashFlowFormData,
      month: this.selectedMonth(),
      year: this.selectedYear()
    }).subscribe({
      next: () => {
        this.isCashFlowModalOpen.set(false);
        this.showToast('Đã thêm khoản dự kiến thu chi!');
      }
    });
  }

  protected approveCashFlowItem(item: CashFlowPlan, autoContract: boolean = false): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    this.svc.approveCashFlowPlan(item.id, {
      status: 'Approved',
      approverName: 'Ban Giám Đốc',
      autoGenerateContract: autoContract
    }, comp.id).subscribe({
      next: (res) => {
        this.showToast(res.message || 'Đã phê duyệt khoản chi!');
        if (autoContract && res?.data?.generatedContractId) {
          const downloadUrl = this.svc.getDownloadContractUrl(res.data.generatedContractId);
          this.svc.downloadBlob(downloadUrl, `HopDong_${res.data.contractCode || item.id}.doc`).subscribe();
        }
      }
    });
  }

  protected rejectCashFlowItem(item: CashFlowPlan): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    this.svc.approveCashFlowPlan(item.id, {
      status: 'Rejected',
      approverName: 'Ban Giám Đốc',
      autoGenerateContract: false
    }, comp.id).subscribe({
      next: () => this.showToast('Đã từ chối khoản chi.')
    });
  }

  protected deleteCashFlowItem(id: number): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    if (!confirm('Xóa khoản dự thu chi này?')) return;
    this.svc.deleteCashFlowPlan(id, comp.id).subscribe({
      next: () => this.showToast('Đã xóa khoản dự chi.')
    });
  }

  // ==========================================
  // Module 3: Cổng tra cứu khách hàng & Chat AI
  // ==========================================
  protected customerPortalTab = signal<'cong-no' | 'ton-kho' | 'tro-ly'>('cong-no');
  protected customerChatInput = signal<string>('');
  protected isSendingQuery = signal<boolean>(false);

  protected sendCustomerMessage(): void {
    const text = this.customerChatInput().trim();
    if (!text || this.isSendingQuery()) return;

    const comp = this.svc.selectedCompany();
    if (!comp) return;

    this.isSendingQuery.set(true);
    this.customerChatInput.set('');

    this.svc.sendCustomerQuery(comp.id, text).subscribe({
      next: () => {
        this.isSendingQuery.set(false);
      },
      error: () => {
        this.isSendingQuery.set(false);
      }
    });
  }

  protected askSampleQuestion(q: string): void {
    this.customerChatInput.set(q);
    this.sendCustomerMessage();
  }

  protected copyLogs(): void {
    const text = this.svc.executionLog();
    navigator.clipboard?.writeText(text);
    this.showToast('Đã sao chép toàn bộ nhật ký vào clipboard!');
  }

  protected showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set('');
      }
    }, 4000);
  }
}
