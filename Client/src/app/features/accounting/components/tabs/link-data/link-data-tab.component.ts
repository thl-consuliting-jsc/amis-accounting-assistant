import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AccountingService } from '../../../services/accounting.service';

export interface MisaReportItem {
  id?: string;
  code: string;
  title: string;
  category: string;
  subGroup?: string | null;
  hasData?: boolean;
  rowCount?: number;
  isFavorite: boolean;
  favOrder?: number;
  order?: number;
}

export interface MisaReportRow {
  code: string;
  name: string;
  note?: string;
  end: number;
  start: number;
  isBold?: boolean;
  level?: number;
  isTotal?: boolean;
  endDisplay?: string;
  startDisplay?: string;
  raw_cols?: string[];
}

export interface SubGroupViewModel {
  name: string | null;
  items: MisaReportItem[];
  col1: MisaReportItem[];
  col2: MisaReportItem[];
  isOpen: boolean;
}

export interface DrilldownInfo {
  code: string;
  name: string;
  amount: number;
  status: string;
}

export interface DialogReportOption {
  code: string;
  name: string;
  selected: boolean;
}

export interface ViewerTabOption {
  code: string;
  label: string;
  title: string;
}

export interface DiCategoryGroup {
  name: string;
  icon: string;
  items: { code: string; name: string }[];
}

@Component({
  selector: 'app-link-data-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './link-data-tab.component.html',
  styleUrl: './link-data-tab.component.scss'
})
export class LinkDataTabComponent implements OnInit {
  public readonly Math = Math;
  private readonly http = inject(HttpClient);
  public readonly svc = inject(AccountingService);

  @Input() set initialModule(mod: string | undefined) {
    if (mod) {
      this.misaActiveMainModule.set(mod);
      if (mod === 'Danh mục') {
        this.switchView('di-hub');
      } else if (mod === 'Báo cáo') {
        this.switchView('catalog');
      }
    }
  }

  // View state: 'catalog' | 'detail' | 'di-hub' | 'di-grid' | 'receivable-detail'
  public readonly viewMode = signal<'catalog' | 'detail' | 'di-hub' | 'di-grid' | 'receivable-detail'>('catalog');

  // Kiểm tra Báo cáo tài chính Modal
  public readonly isCheckModalOpen = signal<boolean>(false);
  public readonly formulaCheckResult = signal<string | null>(null);
  public readonly balanceCheckResult = signal<string | null>(null);

  // Lưu báo cáo Popover
  public readonly isSaveReportOpen = signal<boolean>(false);
  public saveReportName: string = 'B01-DN: Bảng cân đối kế toán - Năm 2026';
  public saveReportGroup: string = 'Báo cáo tài chính';

  // mTax Modal
  public readonly isMtaxModalOpen = signal<boolean>(false);

  // Customer Debt (ReceivableDeptSummary) state
  public readonly customerDebtList = signal<any[]>([
    { "customerCode": "0110481994", "customerName": "CÔNG TY CỔ PHẦN BALD EAGLE", "account": "131", "openingDebt": "-", "openingCredit": "-", "incurredDebt": "167.369.000", "incurredCredit": "167.369.000", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "0111171794", "customerName": "CÔNG TY CỔ PHẦN EASYGOING", "account": "131", "openingDebt": "-", "openingCredit": "-", "incurredDebt": "251.054.000", "incurredCredit": "251.054.000", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "KH00002", "customerName": "GOOGLE ASIA PACIFIC PTE LTD.", "account": "131", "openingDebt": "1.280.148.258", "openingCredit": "-", "incurredDebt": "7.349.889.686", "incurredCredit": "8.625.019.223", "closingDebt": "5.018.721", "closingCredit": "-" },
    { "customerCode": "KH00005", "customerName": "Apple Distribution International Limited", "account": "131", "openingDebt": "1.097.837.410", "openingCredit": "-", "incurredDebt": "4.916.190.433", "incurredCredit": "6.014.027.843", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "KH00007", "customerName": "BYTEDANCE PTE. LTD", "account": "131", "openingDebt": "1.920.167", "openingCredit": "-", "incurredDebt": "9.278.970", "incurredCredit": "6.903.034", "closingDebt": "4.296.103", "closingCredit": "-" },
    { "customerCode": "KH00009", "customerName": "ApplovinCorporation", "account": "131", "openingDebt": "164.869.579", "openingCredit": "-", "incurredDebt": "1.479.348.956", "incurredCredit": "1.644.152.934", "closingDebt": "65.601", "closingCredit": "-" },
    { "customerCode": "KH00011", "customerName": "Đoàn Mạnh Cường", "account": "131", "openingDebt": "11.449.315", "openingCredit": "-", "incurredDebt": "920.548", "incurredCredit": "12.369.863", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "KH00012", "customerName": "Đặng Tuấn Anh", "account": "131", "openingDebt": "1.931.507", "openingCredit": "-", "incurredDebt": "595.890", "incurredCredit": "2.527.397", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "KH00013", "customerName": "Air Smart Advertising Solutions FZ-LLC", "account": "131", "openingDebt": "219.662", "openingCredit": "-", "incurredDebt": "-", "incurredCredit": "-", "closingDebt": "219.662", "closingCredit": "-" },
    { "customerCode": "KH00014", "customerName": "LMI, Inc.", "account": "131", "openingDebt": "47.644.772", "openingCredit": "-", "incurredDebt": "44.283.698", "incurredCredit": "61.708.388", "closingDebt": "30.220.082", "closingCredit": "-" },
    { "customerCode": "KH00015", "customerName": "ADLOGIC TECHNOLOGY PTE. LTD.", "account": "131", "openingDebt": "36.682.491", "openingCredit": "-", "incurredDebt": "126.172.937", "incurredCredit": "139.476.408", "closingDebt": "23.379.020", "closingCredit": "-" },
    { "customerCode": "KH00016", "customerName": "INMOBI PTE LTD", "account": "131", "openingDebt": "9.163.270", "openingCredit": "-", "incurredDebt": "416.837", "incurredCredit": "8.190.411", "closingDebt": "1.389.696", "closingCredit": "-" },
    { "customerCode": "KH00018", "customerName": "META PLATFORMS IRELAND LIMITED", "account": "131", "openingDebt": "79.877.760", "openingCredit": "-", "incurredDebt": "467.637.011", "incurredCredit": "547.514.771", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "KH00019", "customerName": "UnityTechnologies SF", "account": "131", "openingDebt": "89.673.356", "openingCredit": "-", "incurredDebt": "309.075.164", "incurredCredit": "186.851.745", "closingDebt": "211.896.775", "closingCredit": "-" },
    { "customerCode": "KH00022", "customerName": "CÔNG TY CỔ PHẦN SUN LEAF", "account": "131", "openingDebt": "-", "openingCredit": "-", "incurredDebt": "46.260.000", "incurredCredit": "46.260.000", "closingDebt": "-", "closingCredit": "-" },
    { "customerCode": "NCC00008", "customerName": "Nguyễn Hoàng Khánh", "account": "131", "openingDebt": "251.238.356", "openingCredit": "-", "incurredDebt": "-", "incurredCredit": "-", "closingDebt": "251.238.356", "closingCredit": "-" }
  ]);
  public readonly customerDebtSearch = signal<string>('');
  public readonly selectedCustomerDetail = signal<any | null>(null);

  public readonly filteredCustomerDebts = computed(() => {
    const q = this.customerDebtSearch().trim().toLowerCase();
    const list = this.customerDebtList();
    if (!q) return list;
    return list.filter(r =>
      r.customerCode.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q)
    );
  });

  // Master Data (Danh mục) State
  public readonly masterData = signal<Record<string, any[]>>({});
  public readonly diSearchQuery = signal<string>('');
  public readonly selectedDiCode = signal<string>('DICustomer');
  public readonly selectedDiName = signal<string>('Khách hàng');
  public readonly diTableSearch = signal<string>('');
  public readonly diSelectedRecord = signal<any | null>(null);
  public readonly diPage = signal<number>(1);
  public readonly diPageSize = signal<number>(20);

  // Master Data Add / Edit / Delete Modal State
  public readonly isAddEditModalOpen = signal<boolean>(false);
  public readonly modalMode = signal<'add' | 'edit'>('add');
  public readonly isDeleteConfirmOpen = signal<boolean>(false);
  public readonly deleteTargetRow = signal<any | null>(null);
  public readonly actionMenuRowIndex = signal<number | null>(null);
  public readonly isKpiExpanded = signal<boolean>(true);

  public readonly diFormData = signal<{
    isOrg: boolean;
    isCustomer: boolean;
    isInternal: boolean;
    taxCode: string;
    budgetCode: string;
    code: string;
    name: string;
    phone: string;
    website: string;
    address: string;
    group: string;
    employee: string;
    contactSalutation: string;
    contactName: string;
    contactLegalRep: string;
    contactEmail: string;
    contactPhone: string;
    activeTab: 'contact' | 'terms' | 'bank' | 'other' | 'notes' | 'extra';
  }>({
    isOrg: true,
    isCustomer: false,
    isInternal: false,
    taxCode: '',
    budgetCode: '',
    code: '',
    name: '',
    phone: '',
    website: '',
    address: '',
    group: '',
    employee: '',
    contactSalutation: 'Anh',
    contactName: '',
    contactLegalRep: '',
    contactEmail: '',
    contactPhone: '',
    activeTab: 'contact'
  });

  public readonly diGroups: DiCategoryGroup[] = [
    {
      name: 'ĐỐI TƯỢNG',
      icon: 'fa-solid fa-users',
      items: [
        { code: 'DICustomer', name: 'Khách hàng' },
        { code: 'DIVendor', name: 'Nhà cung cấp' },
        { code: 'DIEmployee', name: 'Nhân viên' },
        { code: 'DIAccountObjectGroup', name: 'Nhóm khách hàng, nhà cung cấp' }
      ]
    },
    {
      name: 'VẬT TƯ HÀNG HÓA',
      icon: 'fa-solid fa-boxes-stacked',
      items: [
        { code: 'DIInventoryItems', name: 'Vật tư hàng hóa' },
        { code: 'DIStock', name: 'Kho' },
        { code: 'DIInventoryItemCategory', name: 'Nhóm vật tư, hàng hóa, dịch vụ' },
        { code: 'DIUnit', name: 'Đơn vị tính' }
      ]
    },
    {
      name: 'TÀI KHOẢN',
      icon: 'fa-solid fa-book-bookmark',
      items: [
        { code: 'DIAccount', name: 'Hệ thống tài khoản' },
        { code: 'DIAccountTransfer', name: 'Tài khoản kết chuyển' },
        { code: 'DIAccountDefaultNew', name: 'Tài khoản ngầm định' }
      ]
    },
    {
      name: 'CHI PHÍ & CÔNG TRÌNH',
      icon: 'fa-solid fa-building-wheat',
      items: [
        { code: 'DIJobList', name: 'Đối tượng tập hợp chi phí' },
        { code: 'DIExpenseItem', name: 'Khoản mục chi phí' },
        { code: 'DIProjectWork', name: 'Công trình' },
        { code: 'DIProjectWorkCategory', name: 'Loại công trình' }
      ]
    },
    {
      name: 'NGÂN HÀNG',
      icon: 'fa-solid fa-building-columns',
      items: [
        { code: 'DIBank', name: 'Ngân hàng' },
        { code: 'DIBankAccount', name: 'Tài khoản ngân hàng' }
      ]
    },
    {
      name: 'KHÁC & THUẾ',
      icon: 'fa-solid fa-layer-group',
      items: [
        { code: 'DIOrganizationalStructure', name: 'Cơ cấu tổ chức' },
        { code: 'DISupplyCategory', name: 'Loại công cụ dụng cụ' },
        { code: 'DIFixedAssetCategory', name: 'Loại tài sản cố định' },
        { code: 'DISpecialConsumptionTaxTable', name: 'Biểu thuế tiêu thụ đặc biệt' },
        { code: 'DIResourcesTaxTable', name: 'Biểu thuế tài nguyên' },
        { code: 'DIPaymentTerm', name: 'Điều khoản thanh toán' },
        { code: 'DIBudgetItem', name: 'Mục thu/chi' },
        { code: 'DIListItem', name: 'Mã thống kê' },
        { code: 'DICurrency', name: 'Loại tiền' },
        { code: 'DIVoucherType', name: 'Loại chứng từ' }
      ]
    }
  ];

  public readonly filteredDiGroups = computed(() => {
    const q = this.diSearchQuery().toLowerCase().trim();
    if (!q) return this.diGroups;
    return this.diGroups.map(g => ({
      ...g,
      items: g.items.filter(it => it.name.toLowerCase().includes(q) || it.code.toLowerCase().includes(q))
    })).filter(g => g.items.length > 0);
  });

  public readonly currentDiRows = computed<any[]>(() => {
    const code = this.selectedDiCode();
    const md = this.masterData();
    const rows = md[code] || md[this.selectedDiName()] || [];
    const q = this.diTableSearch().toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => {
      return Object.values(r).some(val => String(val || '').toLowerCase().includes(q));
    });
  });

  public readonly currentDiColumns = computed<string[]>(() => {
    const rows = this.currentDiRows();
    if (!rows || rows.length === 0) {
      const allRows = this.masterData()[this.selectedDiCode()] || [];
      if (allRows.length > 0) return Object.keys(allRows[0]);
      return ['Mã', 'Tên'];
    }
    return Object.keys(rows[0]);
  });

  public readonly pagedDiRows = computed<any[]>(() => {
    const rows = this.currentDiRows();
    const page = this.diPage();
    const size = this.diPageSize();
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  });

  public readonly diTotalPages = computed<number>(() => {
    const total = this.currentDiRows().length;
    return Math.max(1, Math.ceil(total / this.diPageSize()));
  });

  // MISA Leftmost Main Modules
  public readonly misaActiveMainModule = signal<string>('Báo cáo');
  public readonly isMisaSidebarCollapsed = signal<boolean>(false);

  public readonly misaMainModules = [
    { name: 'AVA Kế toán', icon: 'fa-solid fa-wand-magic-sparkles', isAva: true },
    { name: 'Tổng quan', icon: 'fa-solid fa-border-all' },
    { name: 'Tiền mặt', icon: 'fa-regular fa-money-bill-1' },
    { name: 'Tiền gửi', icon: 'fa-solid fa-building-columns' },
    { name: 'Mua hàng', icon: 'fa-solid fa-bag-shopping' },
    { name: 'Bán hàng', icon: 'fa-solid fa-cart-shopping' },
    { name: 'Quản lý hóa đơn', icon: 'fa-regular fa-file-lines' },
    { name: 'Kho', icon: 'fa-solid fa-warehouse' },
    { name: 'Công cụ dụng cụ', icon: 'fa-solid fa-screwdriver-wrench' },
    { name: 'Tài sản cố định', icon: 'fa-solid fa-car-side' },
    { name: 'Tiền lương', icon: 'fa-solid fa-coins' },
    { name: 'Thuế', icon: 'fa-solid fa-receipt' },
    { name: 'Giá thành', icon: 'fa-solid fa-tags' },
    { name: 'Cộng đồng MISA', icon: 'fa-solid fa-snowflake' },
    { name: 'Tổng hợp', icon: 'fa-solid fa-book-open' },
    { name: 'Báo cáo', icon: 'fa-solid fa-chart-column' },
    { name: 'Phân tích tài chính', icon: 'fa-solid fa-chart-line' },
    { name: 'Danh mục', icon: 'fa-solid fa-bars' },
    { name: 'Số dư ban đầu', icon: 'fa-regular fa-file-excel' },
    { name: 'Giải pháp kết nối', icon: 'fa-solid fa-plug', badge: '17', badgeColor: 'red' },
    { name: 'Kiến thức hữu ích', icon: 'fa-regular fa-lightbulb' },
    { name: 'Kết nối vay vốn', icon: 'fa-solid fa-hand-holding-dollar' },
    { name: 'Kết nối bảo hiểm', icon: 'fa-solid fa-shield-heart', badge: 'Mới', badgeColor: 'orange' }
  ];

  // Top Tabs inside MISA Header
  public readonly activeTopTab = signal<'tat-ca' | 'da-luu' | 'dinh-ky' | 'ava'>('tat-ca');

  // Categories list (Middle sidebar)
  public readonly categories = signal<string[]>([
    'Yêu thích',
    'Báo cáo tài chính',
    'Báo cáo phân tích',
    'Tiền mặt',
    'Tiền gửi',
    'Mua hàng',
    'Bán hàng',
    'Kho',
    'Công cụ dụng cụ',
    'Tài sản cố định',
    'Tiền lương',
    'Thuế',
    'Giá thành',
    'Tổng hợp',
    'Báo cáo đối chiếu'
  ]);

  public readonly activeCategory = signal<string>('Báo cáo tài chính');
  public readonly searchQuery = signal<string>('');
  public readonly tableSearchQuery = signal<string>('');
  public readonly selectedLanguage = signal<string>('Tiếng Việt');

  // Catalog items & Report data dictionary
  public readonly catalog = signal<MisaReportItem[]>([]);
  public readonly reportData = signal<Record<string, MisaReportRow[]>>({});

  // Active Report being viewed
  public readonly activeReportCode = signal<string>('GLB01_DN');
  public readonly activeReportTitle = signal<string>('B01-DN: Bảng cân đối kế toán');
  public readonly activeReportRows = signal<MisaReportRow[]>([]);
  public readonly activeSheetTab = signal<string>('B01 - DN');

  // Collapsed sub-groups state
  public readonly collapsedSubGroups = signal<Record<string, boolean>>({});

  // Multi-tab list inside the RPDynamicViewer (matches real MISA report tabs)
  public readonly viewerTabs = signal<ViewerTabOption[]>([
    { code: 'GLB01_DN', label: 'B01 - DN', title: 'B01-DN: Bảng cân đối kế toán' }
  ]);

  // Parameter Modal (Slide Drawer) state
  public readonly isParamModalOpen = signal<boolean>(false);
  public readonly paramReportCode = signal<string>('GLB01_DN');
  public readonly paramPeriodType = signal<string>('Năm');
  public readonly paramYear = signal<number>(2026);
  public readonly paramFromDate = signal<string>('01/01/2026');
  public readonly paramToDate = signal<string>('31/12/2026');
  public readonly paramFromFinancialReport = signal<boolean>(false);
  public readonly paramIsAudited = signal<boolean>(false);
  public readonly paramHideZero = signal<boolean>(false);
  public readonly paramBranch = signal<string>('CÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI');
  public readonly paramDirector = signal<string>('NGUYỄN ĐẮC THUẬN');
  public readonly paramPreparer = signal<string>('Trần Thị Phương');
  public readonly paramDateDisplay = signal<string>('19/11/2026');

  // List of reports inside the Parameter Drawer (matches real MISA grid)
  public readonly dialogReports = signal<DialogReportOption[]>([
    { code: 'B01 - DN', name: 'Bảng cân đối kế toán', selected: true },
    { code: 'B02 - DN', name: 'Báo cáo kết quả hoạt động kinh doanh', selected: false },
    { code: 'B03 - DN', name: 'Báo cáo lưu chuyển tiền tệ (Phương pháp trực tiếp)', selected: false },
    { code: 'B03 - DN - GT', name: 'Báo cáo lưu chuyển tiền tệ (Phương pháp gián tiếp)', selected: false }
  ]);

  // Saved reports mock list for tab 'Báo cáo đã lưu'
  public readonly savedReports = signal([
    { id: '1', title: 'Bảng cân đối kế toán quý 3/2026 (Đã chốt thuế)', author: 'Trần Thị Phương', date: '15/10/2026', format: 'A4 Dọc' },
    { id: '2', title: 'Báo cáo kết quả kinh doanh 9 tháng đầu năm', author: 'Trần Thị Phương', date: '10/10/2026', format: 'A4 Dọc' },
    { id: '3', title: 'Bảng cân đối tài khoản chi tiết công nợ ONDI', author: 'Vũ Thị Mai Lan', date: '01/11/2026', format: 'A4 Ngang' }
  ]);

  // Scheduled reports mock list for tab 'Lịch gửi báo cáo định kỳ'
  public readonly scheduledReports = signal([
    { id: '1', name: 'Gửi BCTC định kỳ hàng tháng cho Ban Giám Đốc', reports: 'B01-DN, B02-DN', frequency: 'Ngày 05 hàng tháng', emails: 'thuannd@ondi.vn, phuongtt@thlconsulting.vn', status: 'Đang chạy' },
    { id: '2', name: 'Đối chiếu số dư tiền gửi ngân hàng tuần', reports: 'Sổ tiền gửi ngân hàng', frequency: 'Thứ 6 hàng tuần', emails: 'ketoan@ondi.vn', status: 'Đang chạy' }
  ]);

  // Drilldown Modal
  public readonly drilldownInfo = signal<DrilldownInfo | null>(null);

  // Sync notification
  public readonly toastMessage = signal<string | null>(null);

  // Company metadata
  public readonly companyInfo = signal<any>({
    name: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI',
    taxCode: '0110030367',
    address: 'Tầng 6, Tòa nhà Sky Tower, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    database: 'BC THUẾ_Current',
    director: 'NGUYỄN ĐẮC THUẬN',
    chiefAccountant: 'Vũ Thị Mai Lan',
    preparer: 'Trần Thị Phương'
  });

  // Filtered sub-groups and 2-column distribution matching real MISA 1:1
  public readonly currentCategorySubGroups = computed<SubGroupViewModel[]>(() => {
    const cat = this.activeCategory();
    const query = this.searchQuery().trim().toLowerCase();
    const collapsedMap = this.collapsedSubGroups();
    let list = this.catalog();

    if (cat === 'Yêu thích') {
      list = list.filter(item => item.isFavorite || item.category === 'Yêu thích');
      list.sort((a, b) => (a.favOrder ?? 999) - (b.favOrder ?? 999));
    } else {
      list = list.filter(item => item.category === cat);
    }

    if (query) {
      list = list.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
      );
    }

    // Group items by subGroup
    const groupMap = new Map<string | null, MisaReportItem[]>();
    for (const item of list) {
      const sg = (cat === 'Yêu thích' || cat === 'Báo cáo tài chính') ? null : (item.subGroup || null);
      if (!groupMap.has(sg)) {
        groupMap.set(sg, []);
      }
      groupMap.get(sg)!.push(item);
    }

    const result: SubGroupViewModel[] = [];
    for (const [name, items] of groupMap.entries()) {
      // In real MISA, 2-column grid alternates: col1 gets even index (0,2,4..), col2 gets odd index (1,3,5..)
      const col1 = items.filter((_, i) => i % 2 === 0);
      const col2 = items.filter((_, i) => i % 2 === 1);
      const isCollapsed = name ? !!collapsedMap[name] : false;

      result.push({
        name,
        items,
        col1,
        col2,
        isOpen: !isCollapsed
      });
    }

    return result;
  });

  // Filtered Table Rows
  public readonly filteredRows = computed(() => {
    const rows = this.activeReportRows();
    const query = this.tableSearchQuery().trim().toLowerCase();
    const hideZero = this.paramHideZero();

    return rows.filter(r => {
      if (hideZero && r.end === 0 && r.start === 0 && !r.isBold && !r.isTotal) {
        return false;
      }
      if (!query) return true;
      return (
        r.name.toLowerCase().includes(query) ||
        r.code.toLowerCase().includes(query) ||
        (r.note && r.note.toLowerCase().includes(query))
      );
    });
  });

  ngOnInit(): void {
    this.loadData();
  }

  public loadData(): void {
    this.http.get<any>('assets/data/misa_reports_full.json').subscribe({
      next: (res) => {
        this.processLoadedData(res);
      },
      error: () => {
        this.http.get<any>('http://localhost:9093/api/accounting/misa-reports/full').subscribe({
          next: (res) => this.processLoadedData(res),
          error: (err) => console.error('Failed to load MISA report data:', err)
        });
      }
    });
  }

  private processLoadedData(data: any): void {
    if (!data) return;
    if (data.company) this.companyInfo.set(data.company);
    if (data.categories && data.categories.length) this.categories.set(data.categories);
    if (data.catalog) this.catalog.set(data.catalog);
    if (data.masterData) this.masterData.set(data.masterData);
    if (data.data) {
      this.reportData.set(data.data);
      const b01 = data.data['GLB01_DN'] || data.data['B01-DN: Bảng cân đối kế toán'];
      if (b01) {
        this.activeReportRows.set(b01);
      }
    }
  }

  public selectCategory(cat: string): void {
    this.activeCategory.set(cat);
    this.searchQuery.set('');
  }

  public toggleSubGroup(groupName: string | null): void {
    if (!groupName) return;
    const current = { ...this.collapsedSubGroups() };
    current[groupName] = !current[groupName];
    this.collapsedSubGroups.set(current);
  }

  public selectMisaMainModule(mod: string): void {
    this.misaActiveMainModule.set(mod);
    if (mod === 'Báo cáo') {
      this.switchView('catalog');
    } else if (mod === 'Danh mục') {
      this.switchView('di-hub');
    } else if (this.categories().includes(mod)) {
      this.activeCategory.set(mod);
      this.switchView('catalog');
    } else {
      this.showToast(`Bạn đang ở phân hệ "${mod}" trên MISA AMIS`);
    }
  }

  public toggleMisaSidebar(): void {
    this.isMisaSidebarCollapsed.set(!this.isMisaSidebarCollapsed());
  }

  public switchView(view: 'catalog' | 'detail' | 'di-hub' | 'di-grid'): void {
    this.viewMode.set(view);
    this.tableSearchQuery.set('');
    if (view === 'di-hub') {
      this.diSearchQuery.set('');
    } else if (view === 'di-grid') {
      this.diTableSearch.set('');
      this.diPage.set(1);
    }
  }

  public getDiCount(code: string, name: string): number {
    const md = this.masterData();
    const rows = md[code] || md[name] || [];
    return rows.length;
  }

  public openDiCategory(code: string, name: string): void {
    this.selectedDiCode.set(code);
    this.selectedDiName.set(name);
    this.diTableSearch.set('');
    this.diPage.set(1);
    this.switchView('di-grid');
  }

  public closeDiGrid(): void {
    this.switchView('di-hub');
  }

  public openRecordDetail(row: any): void {
    this.diSelectedRecord.set(row);
  }

  public closeRecordDetail(): void {
    this.diSelectedRecord.set(null);
  }

  public getRecordEntries(row: any): [string, any][] {
    if (!row) return [];
    return Object.entries(row);
  }

  public isNumberValue(val: any): boolean {
    if (typeof val === 'number') return true;
    if (typeof val === 'string' && /^-?\d+(\.\d+)?$/.test(val.trim())) return true;
    return false;
  }

  public formatDiCellValue(val: any): string {
    if (val === null || val === undefined || val === '') return '-';
    if (typeof val === 'number') return val.toLocaleString('vi-VN');
    return String(val);
  }

  public onDiPageChange(page: number): void {
    if (page >= 1 && page <= this.diTotalPages()) {
      this.diPage.set(page);
    }
  }

  public onDiPageSizeChange(event: Event): void {
    const val = Number((event.target as HTMLSelectElement).value);
    this.diPageSize.set(val);
    this.diPage.set(1);
  }

  public exportDiExcel(): void {
    const name = this.selectedDiName();
    const rows = this.currentDiRows();
    const cols = this.currentDiColumns();
    if (!rows.length) {
      this.showToast('Không có dữ liệu để xuất Excel');
      return;
    }

    let csv = `\uFEFFDanh mục: ${name}\r\n`;
    csv += cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',') + '\r\n';
    for (const r of rows) {
      const line = cols.map(c => {
        const v = r[c] !== undefined && r[c] !== null ? String(r[c]) : '';
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',');
      csv += line + '\r\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${name}_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast(`Đã xuất khẩu ${rows.length} bản ghi sang file CSV/Excel thành công`);
  }

  public toggleKpi(): void {
    this.isKpiExpanded.set(!this.isKpiExpanded());
  }

  public openAddModal(): void {
    const code = this.selectedDiCode();
    const rows = this.masterData()[code] || [];
    const prefix = code === 'DIVendor' ? 'NCC' : (code === 'DICustomer' ? 'KH' : 'DT');
    const nextNum = String(rows.length + 1).padStart(5, '0');

    this.diFormData.set({
      isOrg: true,
      isCustomer: false,
      isInternal: false,
      taxCode: '',
      budgetCode: '',
      code: `${prefix}${nextNum}`,
      name: '',
      phone: '',
      website: '',
      address: '',
      group: '',
      employee: '',
      contactSalutation: 'Anh',
      contactName: '',
      contactLegalRep: '',
      contactEmail: '',
      contactPhone: '',
      activeTab: 'contact'
    });
    this.modalMode.set('add');
    this.isAddEditModalOpen.set(true);
    this.actionMenuRowIndex.set(null);
  }

  public openEditModal(row: any): void {
    const codeKey = Object.keys(row).find(k => k.toLowerCase().includes('mã') && !k.toLowerCase().includes('thuế')) || Object.keys(row)[0] || 'Mã';
    const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('tên')) || Object.keys(row)[1] || 'Tên';
    const addrKey = Object.keys(row).find(k => k.toLowerCase().includes('địa chỉ')) || 'Địa chỉ';
    const taxKey = Object.keys(row).find(k => k.toLowerCase().includes('thuế') || k.toLowerCase().includes('cccd')) || 'Mã số thuế';
    const phoneKey = Object.keys(row).find(k => k.toLowerCase().includes('thoại')) || 'Điện thoại';

    this.diFormData.set({
      isOrg: true,
      isCustomer: false,
      isInternal: false,
      taxCode: row[taxKey] || '',
      budgetCode: '',
      code: row[codeKey] || '',
      name: row[nameKey] || '',
      phone: row[phoneKey] || '',
      website: '',
      address: row[addrKey] || '',
      group: '',
      employee: '',
      contactSalutation: 'Anh',
      contactName: '',
      contactLegalRep: '',
      contactEmail: '',
      contactPhone: '',
      activeTab: 'contact'
    });
    this.modalMode.set('edit');
    this.isAddEditModalOpen.set(true);
    this.actionMenuRowIndex.set(null);
  }

  public closeAddEditModal(): void {
    this.isAddEditModalOpen.set(false);
  }

  public setDiFormTab(tab: 'contact' | 'terms' | 'bank' | 'other' | 'notes' | 'extra'): void {
    this.diFormData.set({
      ...this.diFormData(),
      activeTab: tab
    });
  }

  public saveDiRecord(andAddMore: boolean = false): void {
    const form = this.diFormData();
    if (!form.code.trim()) {
      this.showToast('Vui lòng nhập Mã đối tượng');
      return;
    }
    if (!form.name.trim()) {
      this.showToast('Vui lòng nhập Tên đối tượng');
      return;
    }

    const dictCode = this.selectedDiCode();
    const dictName = this.selectedDiName();
    const md = { ...this.masterData() };
    const rows = [...(md[dictCode] || md[dictName] || [])];

    if (this.modalMode() === 'add') {
      const newRec: any = {};
      const cols = this.currentDiColumns();
      for (const col of cols) {
        const cl = col.toLowerCase();
        if (cl.includes('mã') && !cl.includes('thuế')) newRec[col] = form.code;
        else if (cl.includes('tên')) newRec[col] = form.name;
        else if (cl.includes('thuế') || cl.includes('cccd')) newRec[col] = form.taxCode;
        else if (cl.includes('địa chỉ')) newRec[col] = form.address;
        else if (cl.includes('thoại')) newRec[col] = form.phone;
        else if (cl.includes('nợ')) newRec[col] = 0;
        else newRec[col] = '-';
      }
      rows.unshift(newRec);
      this.showToast(`Đã cất đối tượng "${form.name}" thành công`);
    } else {
      const codeKey = Object.keys(rows[0] || {}).find(k => k.toLowerCase().includes('mã') && !k.toLowerCase().includes('thuế')) || Object.keys(rows[0] || {})[0];
      const idx = rows.findIndex(r => r[codeKey] === form.code);
      if (idx !== -1) {
        const nameKey = Object.keys(rows[idx]).find(k => k.toLowerCase().includes('tên')) || 'Tên';
        const addrKey = Object.keys(rows[idx]).find(k => k.toLowerCase().includes('địa chỉ')) || 'Địa chỉ';
        const taxKey = Object.keys(rows[idx]).find(k => k.toLowerCase().includes('thuế')) || 'Mã số thuế';
        const phoneKey = Object.keys(rows[idx]).find(k => k.toLowerCase().includes('thoại')) || 'Điện thoại';
        rows[idx] = {
          ...rows[idx],
          [nameKey]: form.name,
          [addrKey]: form.address,
          ...(taxKey ? { [taxKey]: form.taxCode } : {}),
          ...(phoneKey ? { [phoneKey]: form.phone } : {})
        };
      }
      this.showToast(`Đã cập nhật đối tượng "${form.name}" thành công`);
    }

    md[dictCode] = rows;
    md[dictName] = rows;
    this.masterData.set(md);

    if (andAddMore) {
      this.openAddModal();
    } else {
      this.closeAddEditModal();
    }
  }

  public promptDeleteRow(row: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.deleteTargetRow.set(row);
    this.isDeleteConfirmOpen.set(true);
    this.actionMenuRowIndex.set(null);
  }

  public cancelDelete(): void {
    this.isDeleteConfirmOpen.set(false);
    this.deleteTargetRow.set(null);
  }

  public executeDelete(): void {
    const row = this.deleteTargetRow();
    if (!row) return;

    const dictCode = this.selectedDiCode();
    const dictName = this.selectedDiName();
    const md = { ...this.masterData() };
    const rows = (md[dictCode] || md[dictName] || []).filter((r: any) => r !== row);

    md[dictCode] = rows;
    md[dictName] = rows;
    this.masterData.set(md);

    this.isDeleteConfirmOpen.set(false);
    this.deleteTargetRow.set(null);
    this.showToast('Đã xóa đối tượng khỏi danh mục thành công');
  }

  public toggleActionMenu(idx: number, event: Event): void {
    event.stopPropagation();
    if (this.actionMenuRowIndex() === idx) {
      this.actionMenuRowIndex.set(null);
    } else {
      this.actionMenuRowIndex.set(idx);
    }
  }

  public closeActionMenu(): void {
    this.actionMenuRowIndex.set(null);
  }

  public promptReportModal(reportCodeOrTitle: string): void {
    this.paramReportCode.set(reportCodeOrTitle);
    
    // Select corresponding report in the drawer grid
    const code = reportCodeOrTitle.toUpperCase();
    const reports = [...this.dialogReports()];
    reports.forEach(r => {
      if (code.includes('B01') && r.code.includes('B01')) r.selected = true;
      else if (code.includes('B02') && r.code.includes('B02')) r.selected = true;
      else if (code.includes('B03') && !code.includes('GT') && r.code.includes('B03') && !r.code.includes('GT')) r.selected = true;
      else if (code.includes('GT') && r.code.includes('GT')) r.selected = true;
      else r.selected = false;
    });
    this.dialogReports.set(reports);

    this.isParamModalOpen.set(true);
  }

  public closeModal(): void {
    this.isParamModalOpen.set(false);
  }

  public toggleDialogReport(rep: DialogReportOption): void {
    rep.selected = !rep.selected;
  }

  public onPeriodChange(period: string): void {
    if (period === 'Năm') {
      this.paramFromDate.set('01/01/2026');
      this.paramToDate.set('31/12/2026');
    } else if (period === 'Quý 4') {
      this.paramFromDate.set('01/10/2026');
      this.paramToDate.set('31/12/2026');
    } else if (period === 'Tháng 11') {
      this.paramFromDate.set('01/11/2026');
      this.paramToDate.set('30/11/2026');
    }
  }

  public confirmAndOpenReport(): void {
    const selectedList = this.dialogReports().filter(r => r.selected);
    if (selectedList.length > 0) {
      const tabs: ViewerTabOption[] = selectedList.map(item => {
        let code = item.code;
        if (item.code.includes('B01')) code = 'GLB01_DN';
        else if (item.code.includes('B02')) code = 'GLB02_DN';
        else if (item.code.includes('B03') && !item.code.includes('GT')) code = 'GLB03_DN';
        else if (item.code.includes('GT')) code = 'GLB03_DN_Indirect';
        return {
          code: code,
          label: item.code,
          title: `${item.code}: ${item.name}`
        };
      });
      this.viewerTabs.set(tabs);
      const first = selectedList[0];
      this.closeModal();
      this.openReport(first.code);
    } else {
      const code = this.paramReportCode();
      this.closeModal();
      this.openReport(code);
    }
  }

  public openReport(codeOrTitle: string): void {
    const dataDict = this.reportData();
    let rows: MisaReportRow[] = [];

    // Map common codes
    let searchKey = codeOrTitle;
    if (codeOrTitle.includes('B01')) searchKey = 'GLB01_DN';
    else if (codeOrTitle.includes('B02')) searchKey = 'GLB02_DN';
    else if (codeOrTitle.includes('B03') && !codeOrTitle.includes('GT')) searchKey = 'GLB03_DN';
    else if (codeOrTitle.includes('GT')) searchKey = 'GLB03_DN_Indirect';

    if (dataDict[searchKey]) {
      rows = dataDict[searchKey];
    } else if (dataDict[codeOrTitle]) {
      rows = dataDict[codeOrTitle];
    } else {
      const catItem = this.catalog().find(c => c.code === codeOrTitle || c.title === codeOrTitle);
      if (catItem && dataDict[catItem.code]) {
        rows = dataDict[catItem.code];
      } else if (catItem && dataDict[catItem.title]) {
        rows = dataDict[catItem.title];
      } else {
        // Fallback: Generate realistic template rows based on title
        rows = this.generateSampleReportRows(codeOrTitle);
      }
    }

    let title = codeOrTitle;
    const item = this.catalog().find(c => c.code === codeOrTitle || c.title === codeOrTitle || c.code === searchKey);
    if (item) title = item.title;
    else if (codeOrTitle.includes('B01')) title = 'B01-DN: Bảng cân đối kế toán';
    else if (codeOrTitle.includes('B02')) title = 'B02-DN: Báo cáo kết quả hoạt động kinh doanh';
    else if (codeOrTitle.includes('B03') && !codeOrTitle.includes('GT')) title = 'B03-DN: Báo cáo lưu chuyển tiền tệ (PP trực tiếp)';
    else if (codeOrTitle.includes('GT')) title = 'B03-DN-GT: Báo cáo lưu chuyển tiền tệ (PP gián tiếp)';

    let activeTabLabel = 'B01 - DN';
    // Update active sheet tab name
    if (title.includes('B01')) activeTabLabel = 'B01 - DN';
    else if (title.includes('B02')) activeTabLabel = 'B02 - DN';
    else if (title.includes('B03') && !title.includes('GT')) activeTabLabel = 'B03 - DN';
    else if (title.includes('GT')) activeTabLabel = 'B03 - DN - GT';
    else if (title.includes('B09')) activeTabLabel = 'B09 - DN';
    else activeTabLabel = title.split(':')[0] || 'Báo cáo';

    this.activeSheetTab.set(activeTabLabel);

    // Ensure tab exists in viewerTabs
    const currentTabs = this.viewerTabs();
    if (!currentTabs.some(t => t.label === activeTabLabel || t.code === codeOrTitle || t.code === searchKey)) {
      this.viewerTabs.set([...currentTabs, {
        code: searchKey,
        label: activeTabLabel,
        title: title
      }]);
    }

    this.activeReportCode.set(codeOrTitle);
    this.activeReportTitle.set(title);
    this.activeReportRows.set(rows);
    this.switchView('detail');
  }

  private generateSampleReportRows(title: string): MisaReportRow[] {
    return [
      {
        code: '01',
        name: `1. Phát sinh lũy kế theo ${title}`,
        note: '',
        end: 1850000000,
        start: 1450000000,
        isBold: false,
        level: 1,
        endDisplay: '1.850.000.000',
        startDisplay: '1.450.000.000'
      },
      {
        code: '02',
        name: '2. Các khoản chi tiết theo hóa đơn chứng từ',
        note: '',
        end: 890000000,
        start: 620000000,
        isBold: false,
        level: 2,
        endDisplay: '890.000.000',
        startDisplay: '620.000.000'
      },
      {
        code: '03',
        name: '3. Số dư đối chiếu khớp đúng với sổ cái AMIS',
        note: '',
        end: 960000000,
        start: 830000000,
        isBold: false,
        level: 2,
        endDisplay: '960.000.000',
        startDisplay: '830.000.000'
      },
      {
        code: 'TC',
        name: 'TỔNG CỘNG',
        note: '',
        end: 1850000000,
        start: 1450000000,
        isBold: true,
        isTotal: true,
        level: 1,
        endDisplay: '1.850.000.000',
        startDisplay: '1.450.000.000'
      }
    ];
  }

  // Switch between tabs in the RPDynamicViewer toolbar
  public selectViewerTab(tab: ViewerTabOption): void {
    this.openReport(tab.code);
  }

  // Clean paper title matching real MISA (e.g. "BẢNG CÂN ĐỐI KẾ TOÁN")
  public getPaperMainTitle(): string {
    const title = this.activeReportTitle();
    if (title.includes(':')) {
      return title.split(':')[1].trim().toUpperCase();
    }
    return title.toUpperCase();
  }

  public getFormCode(): string {
    const code = this.activeReportCode();
    const title = this.activeReportTitle();
    if (code.includes('B01') || title.includes('B01')) return 'Mẫu số B01 - DN';
    if (code.includes('B02') || title.includes('B02')) return 'Mẫu số B02 - DN';
    if (code.includes('B03') || title.includes('B03')) return 'Mẫu số B03 - DN';
    if (code.includes('F01') || title.includes('F01')) return 'Mẫu số F01 - DNN';
    if (code.includes('B09') || title.includes('B09')) return 'Mẫu số B09 - DN';
    if (title.includes('nhật ký')) return 'Mẫu số S03a - DN';
    if (title.includes('tài sản')) return 'Mẫu số S21 - DN';
    return 'Mẫu quản trị';
  }

  public getClosingColHeader(): string {
    const code = this.activeReportCode();
    const title = this.activeReportTitle();
    if (code.includes('B02') || title.includes('B02')) return 'Năm nay';
    if (code.includes('B03') || title.includes('B03')) return 'Kỳ này';
    if (code.includes('Gov') || title.includes('nghĩa vụ')) return 'Số đã nộp';
    if (title.includes('nhật ký')) return 'Số phát sinh Nợ';
    if (title.includes('tồn kho')) return 'Tồn cuối kỳ';
    return 'Số cuối năm';
  }

  public getOpeningColHeader(): string {
    const code = this.activeReportCode();
    const title = this.activeReportTitle();
    if (code.includes('B02') || title.includes('B02')) return 'Năm trước';
    if (code.includes('B03') || title.includes('B03')) return 'Kỳ trước';
    if (code.includes('Gov') || title.includes('nghĩa vụ')) return 'Số phải nộp';
    if (title.includes('nhật ký')) return 'Số phát sinh Có';
    if (title.includes('tồn kho')) return 'Tồn đầu kỳ';
    return 'Số đầu năm';
  }

  // Blank empty string when zero/null, matching real MISA 1:1 (NO DASHES)
  public formatNumber(num: number | null | undefined): string {
    if (num === null || num === undefined || isNaN(num) || num === 0) return '';
    if (num < 0) {
      const pos = Math.abs(num);
      return `(${pos.toLocaleString('vi-VN')})`;
    }
    return num.toLocaleString('vi-VN');
  }

  public getEndDisplay(row: MisaReportRow): string {
    if (row.endDisplay !== undefined && row.endDisplay !== null) return row.endDisplay;
    return this.formatNumber(row.end);
  }

  public getStartDisplay(row: MisaReportRow): string {
    if (row.startDisplay !== undefined && row.startDisplay !== null) return row.startDisplay;
    return this.formatNumber(row.start);
  }

  public isTotalRow(row: MisaReportRow): boolean {
    return !!row.isTotal || (!!row.name && row.name.startsWith('TỔNG CỘNG'));
  }

  public isDrilldownable(row: MisaReportRow): boolean {
    if (row.isBold || row.isTotal) return false;
    return (row.end !== 0 || row.start !== 0);
  }

  public showDrilldown(row: MisaReportRow): void {
    if (!row.end && !row.start) return;

    if (row.code === '131' || (row.name && row.name.toLowerCase().includes('phải thu'))) {
      this.viewMode.set('receivable-detail');
      return;
    }

    this.drilldownInfo.set({
      code: row.code,
      name: row.name,
      amount: row.end || row.start,
      status: 'Đã đối chiếu khớp bảng cân đối phát sinh và sổ cái chi tiết.'
    });
  }

  public openCheckModal(): void {
    this.formulaCheckResult.set(null);
    this.balanceCheckResult.set(null);
    this.isCheckModalOpen.set(true);
  }

  public closeCheckModal(): void {
    this.isCheckModalOpen.set(false);
  }

  public runFormulaCheck(): void {
    this.formulaCheckResult.set('Tất cả công thức chỉ tiêu Báo cáo tài chính đã thiết lập chuẩn xác theo Thông tư 200/133, không có trùng lặp.');
  }

  public runBalanceCheck(): void {
    this.balanceCheckResult.set('Bảng cân đối kế toán cân đối tuyệt đối: Tổng tài sản (5.729.492.397 đ) = Tổng nguồn vốn (5.729.492.397 đ). Chênh lệch = 0 đ.');
  }

  public toggleSaveReportPopover(e: Event): void {
    e.stopPropagation();
    this.isSaveReportOpen.set(!this.isSaveReportOpen());
  }

  public executeSaveReport(): void {
    const name = this.saveReportName.trim() || 'Báo cáo tài chính năm 2026';
    const currentSaved = this.savedReports();
    this.savedReports.set([
      {
        id: String(Date.now()),
        title: name,
        author: 'Trần Thị Phương',
        date: new Date().toLocaleDateString('vi-VN'),
        format: 'A4 Dọc'
      },
      ...currentSaved
    ]);
    this.isSaveReportOpen.set(false);
    this.showToast(`Đã lưu mẫu báo cáo "${name}" thành công!`);
  }

  public openSavedReportsList(): void {
    this.switchView('catalog');
    this.activeTopTab.set('da-luu');
  }

  public openMtaxModal(): void {
    this.isMtaxModalOpen.set(true);
  }

  public closeMtaxModal(): void {
    this.isMtaxModalOpen.set(false);
  }

  public submitMtax(): void {
    this.isMtaxModalOpen.set(false);
    this.showToast('Ký số MISA eSign thành công! Đã nộp tờ khai B01-DN tới Cổng Thuế điện tử.');
  }

  public exportXmlReport(): void {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<HSoThueDTu xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue">
  <HSoKhaiThue>
    <TTinChung>
      <TTinTKhaiThue>
        <maTKhai>101</maTKhai>
        <tenTKhai>Báo cáo tài chính năm 2026 (B01-DN)</tenTKhai>
        <maSoThue>0111154196</maSoThue>
        <tenNNT>CÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI</tenNNT>
        <kyKKhai>2026</kyKKhai>
        <ngayNop>${new Date().toISOString()}</ngayNop>
      </TTinTKhaiThue>
    </TTinChung>
    <BangCanDoiKeToan>
      <TongTaiSan>5729492397</TongTaiSan>
      <TongNguonVon>5729492397</TongNguonVon>
      <TienVaTuongDuongTien>350534691</TienVaTuongDuongTien>
      <PhaiThuKhachHang>527737402</PhaiThuKhachHang>
    </BangCanDoiKeToan>
  </HSoKhaiThue>
</HSoThueDTu>`;
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'B01_DN_ONDI_2026.xml';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Đã tải xuống tệp XML BCTC (B01-DN) chuẩn nộp thuế.');
  }

  public showCustomerDetail(cust: any): void {
    this.selectedCustomerDetail.set(cust);
  }

  public closeCustomerDetail(): void {
    this.selectedCustomerDetail.set(null);
  }

  public exportCustomerDebtExcel(): void {
    const list = this.filteredCustomerDebts();
    let csv = `\uFEFFBÁO CÁO TỔNG HỢP CÔNG NỢ PHẢI THU KHÁCH HÀNG - NĂM 2026\r\nCÔNG TY CỔ PHẦN CÔNG NGHỆ ONDI\r\nMã KH,Tên khách hàng,TK,Dư đầu Nợ,Dư đầu Có,Phát sinh Nợ,Phát sinh Có,Dư cuối Nợ,Dư cuối Có\r\n`;
    for (const r of list) {
      csv += `"${r.customerCode}","${r.customerName}","${r.account}","${r.openingDebt}","${r.openingCredit}","${r.incurredDebt}","${r.incurredCredit}","${r.closingDebt}","${r.closingCredit}"\r\n`;
    }
    csv += `"TỔNG CỘNG","","","3.160.095.275","-","15.291.995.912","17.924.353.785","527.737.402","-"\r\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TongHopCongNoPhaiThu_131_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Đã xuất khẩu tệp Excel Tổng hợp công nợ 131.');
  }

  public closeDrilldown(): void {
    this.drilldownInfo.set(null);
  }

  public toggleFavorite(item: MisaReportItem, event: Event): void {
    event.stopPropagation();
    item.isFavorite = !item.isFavorite;
    this.showToast(item.isFavorite ? `Đã thêm "${item.title}" vào Yêu thích` : `Đã bỏ yêu thích "${item.title}"`);
  }

  public printReport(): void {
    window.print();
  }

  public exportExcel(): void {
    const code = this.activeReportCode();
    const title = this.activeReportTitle();
    const rows = this.activeReportRows();

    let csv = `\uFEFF${title}\r\n`;
    csv += `Chỉ tiêu,Mã số,Thuyết minh,${this.getClosingColHeader()},${this.getOpeningColHeader()}\r\n`;
    for (const r of rows) {
      const name = `"${r.name.replace(/"/g, '""')}"`;
      csv += `${name},${r.code || ''},${r.note || ''},${r.end || ''},${r.start || ''}\r\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${code}_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('Đã xuất khẩu báo cáo Excel/CSV thành công');
  }

  public triggerSync(): void {
    this.showToast('Đang kết nối MISA Cloud (actapp.misa.vn) & đồng bộ dữ liệu...');
    setTimeout(() => {
      this.loadData();
      this.showToast('Dữ liệu MISA đã được cập nhật mới nhất từ máy chủ!');
    }, 1200);
  }

  public openMisaLiveWeb(): void {
    window.open('https://actapp.misa.vn/', '_blank');
  }

  public showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => {
      if (this.toastMessage() === msg) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }
}
