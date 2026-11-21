import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Company,
  BankAccount,
  AccountingRule,
  BankTransaction,
  ReconciliationSummary,
  GeneratedFile,
  Invoice,
  CcdcItem,
  VatIndicator,
  Partner,
  ContractTemplate,
  ContractDocument,
  GenerateContractRequest,
  CashFlowPlan,
  ApproveCashFlowRequest,
  CustomerDebt,
  InventoryItem,
  CustomerQueryResponse,
  DownloadFolderSettings
} from '../models/accounting.model';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  logs?: string;
  files?: GeneratedFile[];
  reconciliation?: ReconciliationSummary;
}

@Injectable({
  providedIn: 'root'
})
export class AccountingService {
  private readonly http = inject(HttpClient);
  
  private readonly localAgentUrl = 'http://127.0.0.1:9093/api/accounting';
  readonly isLocalAgentConnected = signal<boolean>(false);

  get isRemoteHost(): boolean {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const h = window.location.hostname;
      return h !== 'localhost' && h !== '127.0.0.1' && !h.includes('tauri');
    }
    return false;
  }

  checkLocalAgent(): void {
    if (!this.isRemoteHost) {
      this.isLocalAgentConnected.set(true);
      return;
    }
    this.http.get<any>(`${this.localAgentUrl}/status`).subscribe({
      next: () => this.isLocalAgentConnected.set(true),
      error: () => {
        this.http.get<any>('http://localhost:9093/api/accounting/status').subscribe({
          next: () => this.isLocalAgentConnected.set(true),
          error: () => this.isLocalAgentConnected.set(false)
        });
      }
    });
  }

  constructor() {
    this.checkLocalAgent();
    if (typeof window !== 'undefined' && this.isRemoteHost) {
      setInterval(() => this.checkLocalAgent(), 10000);
    }
  }

  private get baseUrl(): string {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      if (window.location.hostname.includes('tauri')) {
        return 'http://localhost:9093/api/accounting';
      }
      const port = window.location.port === '9092' ? '9093' : (window.location.port === '4200' ? '5005' : '9093');
      return `${window.location.protocol}//${window.location.hostname}:${port}/api/accounting`;
    }
    return 'http://localhost:9093/api/accounting';
  }

  // Signals
  readonly companies = signal<Company[]>([]);
  readonly selectedCompany = signal<Company | null>(null);
  readonly rules = signal<AccountingRule[]>([]);
  readonly bankAccounts = signal<BankAccount[]>([]);
  readonly partners = signal<Partner[]>([]);
  readonly transactions = signal<BankTransaction[]>([]);
  readonly reconciliation = signal<ReconciliationSummary | null>(null);
  readonly generatedFiles = signal<GeneratedFile[]>([]);
  readonly invoices = signal<Invoice[]>([]);
  readonly ccdcList = signal<CcdcItem[]>([]);
  readonly vatIndicators = signal<VatIndicator[]>([]);
  readonly executionLog = signal<string>('');
  readonly isRunningEngine = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly statusMessage = signal<string>('Sẵn sàng');
  readonly toastNotification = signal<string>('');
  readonly currentJobId = signal<string | null>(null);

  // Module 1: Soạn thảo văn bản & Hợp đồng tự động
  readonly contractTemplates = signal<ContractTemplate[]>([]);
  readonly contracts = signal<ContractDocument[]>([]);

  // Module 2: Dự kiến thu chi & Phê duyệt chi
  readonly cashFlowPlans = signal<CashFlowPlan[]>([]);

  // Module 3: Cổng tra cứu khách hàng & Trợ lý thông minh
  readonly customerDebts = signal<CustomerDebt[]>([]);
  readonly inventoryItems = signal<InventoryItem[]>([]);
  readonly customerChatMessages = signal<Array<{ sender: 'user' | 'assistant'; text: string; time: string; data?: any }>>([
    {
      sender: 'assistant',
      text: 'Xin chào quý khách! Tôi là Trợ lý Kế toán & Quản trị kho tự động. Bạn có thể hỏi tôi về Tồn kho sản phẩm ("còn bao nhiêu bàn phím Logitech?"), Số dư công nợ ("công nợ của Corochti là bao nhiêu?"), hoặc tra cứu hóa đơn.',
      time: 'Vừa xong'
    }
  ]);

  // Selected period
  readonly selectedMonth = signal<number>(10);
  readonly selectedYear = signal<number>(2026);
  readonly isAutoPeriod = signal<boolean>(true);

  // Computeds
  readonly hasSelectedCompany = computed(() => this.selectedCompany() !== null);
  readonly matchedTransactionsCount = computed(
    () => this.transactions().filter(t => t.status === 'Matched').length
  );
  readonly unclassifiedTransactionsCount = computed(
    () => this.transactions().filter(t => t.status === 'Unclassified').length
  );

  loadCompanies(): Observable<ApiResponse<Company[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<Company[]>>(`${this.baseUrl}/companies`).pipe(
      tap(res => {
        this.isLoading.set(false);
        if (res.success && res.data.length > 0) {
          this.companies.set(res.data);
          const current = this.selectedCompany();
          if (current) {
            const refreshed = res.data.find(c => c.id === current.id || (c.taxCode && c.taxCode === current.taxCode));
            if (refreshed) {
              this.selectedCompany.set(refreshed);
            }
          } else {
            this.selectCompany(res.data[0]);
          }
        }
      })
    );
  }

  selectCompany(company: Company): void {
    this.selectedCompany.set(company);
    this.loadCompanyDetails(company.id);
  }

  saveCompany(company: Partial<Company>): Observable<ApiResponse<number>> {
    const isNew = !company.id;
    return this.http.post<ApiResponse<number>>(`${this.baseUrl}/companies`, company).pipe(
      tap(res => {
        this.loadCompanies().subscribe({
          next: (loadRes) => {
            if (loadRes.data && loadRes.data.length > 0) {
              const targetId = isNew ? res.data : company.id;
              const saved = loadRes.data.find(c => c.id === targetId || (company.taxCode && c.taxCode === company.taxCode));
              if (saved) {
                this.selectCompany(saved);
              }
            }
          }
        });
      })
    );
  }

  deleteCompany(companyId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}`).pipe(
      tap(() => {
        if (this.selectedCompany()?.id === companyId) {
          this.selectedCompany.set(null);
        }
        this.loadCompanies().subscribe();
      })
    );
  }

  loadCompanyDetails(companyId: number): void {
    this.loadRules(companyId).subscribe();
    this.loadBankAccounts(companyId).subscribe();
    this.loadPartners(companyId).subscribe();
    this.loadTransactions(companyId).subscribe();
    this.loadReconciliation(companyId).subscribe();
    this.loadGeneratedFiles(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
    this.loadInvoices(companyId, 'IN', this.selectedMonth(), this.selectedYear()).subscribe();
    this.loadCcdc(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
    this.loadVatReport(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
    this.loadLogs(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
  }

  loadRules(companyId: number): Observable<ApiResponse<AccountingRule[]>> {
    return this.http.get<ApiResponse<AccountingRule[]>>(`${this.baseUrl}/companies/${companyId}/rules`).pipe(
      tap(res => {
        if (res.success) this.rules.set(res.data);
      })
    );
  }

  saveRule(rule: Partial<AccountingRule>): Observable<ApiResponse<any>> {
    const companyId = rule.companyId || this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    rule.companyId = companyId;

    if (rule.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/rules/${rule.id}`, rule).pipe(
        tap(() => this.loadRules(companyId).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/rules`, rule).pipe(
        tap(() => this.loadRules(companyId).subscribe())
      );
    }
  }

  deleteRule(ruleId: number): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/rules/${ruleId}`).pipe(
      tap(() => {
        if (companyId) this.loadRules(companyId).subscribe();
      })
    );
  }

  loadBankAccounts(companyId: number): Observable<ApiResponse<BankAccount[]>> {
    return this.http.get<ApiResponse<BankAccount[]>>(`${this.baseUrl}/companies/${companyId}/bank-accounts`).pipe(
      tap(res => {
        if (res.success) this.bankAccounts.set(res.data);
      })
    );
  }

  saveBankAccount(account: Partial<BankAccount>): Observable<ApiResponse<any>> {
    const companyId = account.companyId || this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    account.companyId = companyId;

    if (account.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/bank-accounts/${account.id}`, account).pipe(
        tap(() => this.loadBankAccounts(companyId).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/bank-accounts`, account).pipe(
        tap(() => this.loadBankAccounts(companyId).subscribe())
      );
    }
  }

  deleteBankAccount(accountId: number): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/bank-accounts/${accountId}`).pipe(
      tap(() => {
        if (companyId) this.loadBankAccounts(companyId).subscribe();
      })
    );
  }

  loadPartners(companyId: number, type?: string, search?: string): Observable<ApiResponse<Partner[]>> {
    let url = `${this.baseUrl}/companies/${companyId}/partners`;
    const params: string[] = [];
    if (type) params.push(`type=${encodeURIComponent(type)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    return this.http.get<ApiResponse<Partner[]>>(url).pipe(
      tap(res => {
        if (res.success) this.partners.set(res.data);
      })
    );
  }

  savePartner(partner: Partial<Partner>): Observable<ApiResponse<any>> {
    const companyId = partner.companyId || this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    partner.companyId = companyId;

    if (partner.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/partners/${partner.id}`, partner).pipe(
        tap(() => this.loadPartners(companyId).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/partners`, partner).pipe(
        tap(() => this.loadPartners(companyId).subscribe())
      );
    }
  }

  deletePartner(partnerId: number): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/partners/${partnerId}`).pipe(
      tap(() => {
        if (companyId) this.loadPartners(companyId).subscribe();
      })
    );
  }

  loadTransactions(companyId: number, status?: string): Observable<ApiResponse<BankTransaction[]>> {
    const url = status 
      ? `${this.baseUrl}/companies/${companyId}/transactions?status=${status}` 
      : `${this.baseUrl}/companies/${companyId}/transactions`;

    return this.http.get<ApiResponse<BankTransaction[]>>(url).pipe(
      tap(res => {
        if (res.success) this.transactions.set(res.data);
      })
    );
  }

  saveTransaction(tx: Partial<BankTransaction>): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);

    if (tx.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/transactions/${tx.id}`, tx).pipe(
        tap(() => this.loadTransactions(companyId).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/transactions`, tx).pipe(
        tap(() => this.loadTransactions(companyId).subscribe())
      );
    }
  }

  deleteTransaction(txId: number): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/transactions/${txId}`).pipe(
      tap(() => {
        if (companyId) this.loadTransactions(companyId).subscribe();
      })
    );
  }

  loadReconciliation(companyId: number): Observable<ApiResponse<ReconciliationSummary>> {
    return this.http.get<ApiResponse<ReconciliationSummary>>(`${this.baseUrl}/companies/${companyId}/reconciliation`).pipe(
      tap(res => {
        if (res.success) this.reconciliation.set(res.data);
      })
    );
  }

  loadGeneratedFiles(companyId: number, month: number, year: number): Observable<ApiResponse<GeneratedFile[]>> {
    const local$ = this.http.get<ApiResponse<GeneratedFile[]>>(`${this.localAgentUrl}/companies/${companyId}/files?month=${month}&year=${year}`);
    const server$ = this.http.get<ApiResponse<GeneratedFile[]>>(`${this.baseUrl}/companies/${companyId}/files?month=${month}&year=${year}`);

    return local$.pipe(
      catchError(() => server$),
      tap(res => {
        if (res.success) this.generatedFiles.set(res.data);
      })
    );
  }

  loadInvoices(companyId: number, type: string, month: number, year: number): Observable<ApiResponse<Invoice[]>> {
    return this.http.get<ApiResponse<Invoice[]>>(`${this.baseUrl}/companies/${companyId}/invoices?type=${type}&month=${month}&year=${year}`).pipe(
      tap(res => {
        if (res.success) this.invoices.set(res.data);
      })
    );
  }

  saveInvoice(invoice: Partial<Invoice>): Observable<ApiResponse<any>> {
    const companyId = invoice.companyId || this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    invoice.companyId = companyId;

    if (invoice.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/invoices/${invoice.id}`, invoice).pipe(
        tap(() => this.loadInvoices(companyId, invoice.invoiceType || 'IN', this.selectedMonth(), this.selectedYear()).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/invoices`, invoice).pipe(
        tap(() => this.loadInvoices(companyId, invoice.invoiceType || 'IN', this.selectedMonth(), this.selectedYear()).subscribe())
      );
    }
  }

  deleteInvoice(invoiceId: number, type: string = 'IN'): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/invoices/${invoiceId}`).pipe(
      tap(() => {
        if (companyId) this.loadInvoices(companyId, type, this.selectedMonth(), this.selectedYear()).subscribe();
      })
    );
  }

  loadCcdc(companyId: number, month: number, year: number): Observable<ApiResponse<CcdcItem[]>> {
    return this.http.get<ApiResponse<CcdcItem[]>>(`${this.baseUrl}/companies/${companyId}/ccdc?month=${month}&year=${year}`).pipe(
      tap(res => {
        if (res.success) this.ccdcList.set(res.data);
      })
    );
  }

  saveCcdc(ccdc: Partial<CcdcItem>): Observable<ApiResponse<any>> {
    const companyId = ccdc.companyId || this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    ccdc.companyId = companyId;

    if (ccdc.id) {
      return this.http.put<ApiResponse<any>>(`${this.baseUrl}/ccdc/${ccdc.id}`, ccdc).pipe(
        tap(() => this.loadCcdc(companyId, this.selectedMonth(), this.selectedYear()).subscribe())
      );
    } else {
      return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/ccdc`, ccdc).pipe(
        tap(() => this.loadCcdc(companyId, this.selectedMonth(), this.selectedYear()).subscribe())
      );
    }
  }

  deleteCcdc(ccdcId: number): Observable<ApiResponse<any>> {
    const companyId = this.selectedCompany()?.id || (this.companies().length > 0 ? this.companies()[0].id : 1);
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/ccdc/${ccdcId}`).pipe(
      tap(() => {
        if (companyId) this.loadCcdc(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
      })
    );
  }

  loadVatReport(companyId: number, month: number, year: number): Observable<ApiResponse<VatIndicator[]>> {
    return this.http.get<ApiResponse<VatIndicator[]>>(`${this.baseUrl}/companies/${companyId}/vat-report?month=${month}&year=${year}`).pipe(
      tap(res => {
        if (res.success) this.vatIndicators.set(res.data);
      })
    );
  }

  loadLogs(companyId: number, month: number, year: number): Observable<ApiResponse<string>> {
    const local$ = this.http.get<ApiResponse<string>>(`${this.localAgentUrl}/companies/${companyId}/logs?month=${month}&year=${year}`);
    const server$ = this.http.get<ApiResponse<string>>(`${this.baseUrl}/companies/${companyId}/logs?month=${month}&year=${year}`);

    return local$.pipe(
      catchError(() => server$),
      tap(res => {
        if (res.success) this.executionLog.set(res.data);
      })
    );
  }

  runEngine(companyId: number, month: number, year: number): Observable<ApiResponse<any>> {
    this.isRunningEngine.set(true);
    this.statusMessage.set('Đang chuẩn bị yêu cầu lập file...');

    const comp = this.selectedCompany();

    // 1. CHẾ ĐỘ WEB (Từ xa qua VPS): Khởi tạo phiên làm việc tạm thời & Tự động lấy file
    if (this.isRemoteHost) {
      return new Observable<ApiResponse<any>>(subscriber => {
        this.statusMessage.set('Đang kiểm tra kết nối...');

        this.http.get<any>(`${this.baseUrl}/sync/status`).subscribe({
          next: syncStatus => {
            if (syncStatus?.hasActiveAgent) {
              // Có Sync Agent chạy nền trên máy -> Tự động đồng bộ
              this.executeRemoteWebRun(companyId, month, year, comp, subscriber);
            } else {
              // Không có Agent -> Mở trực tiếp hộp thoại chọn thư mục trong trình duyệt (Zero-Install, không cần cài gì)
              this.executeBrowserDirectUpload(companyId, month, year, comp, subscriber);
            }
          },
          error: () => {
            // Trường hợp không check được sync/status -> Dùng trực tiếp chọn thư mục trên trình duyệt
            this.executeBrowserDirectUpload(companyId, month, year, comp, subscriber);
          }
        });
      });
    }

    // 2. CHẾ ĐỘ DESKTOP APP (Hoặc Localhost): Chạy trực tiếp trên ổ D máy tính
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/run-engine`, {
      month,
      year
    }).pipe(
      catchError((err: any) => {
        return of({
          success: false,
          message: err.error?.message || err.message || 'Lỗi khi gọi API lập file.'
        } as ApiResponse<any>);
      }),
      tap(res => {
        this.isRunningEngine.set(false);
        this.statusMessage.set(res.message || 'Lập file hoàn tất!');
        if (res.logs) this.executionLog.set(res.logs);
        if (res.files) this.generatedFiles.set(res.files);
        if (res.reconciliation) this.reconciliation.set(res.reconciliation);
        this.loadTransactions(companyId).subscribe();
      })
    );
  }

  // Thực thi lập file qua phiên tạm thời với danh sách tệp đã chọn sẵn
  executeSessionWithFiles(companyId: number, month: number, year: number, files: { file: File; relPath: string }[]): Observable<ApiResponse<any>> {
    this.isRunningEngine.set(true);
    this.statusMessage.set(`Đang chuẩn bị nạp ${files.length} tệp lên phiên làm việc...`);

    const comp = this.selectedCompany();
    const payload = {
      companyId,
      month,
      year,
      taxCode: comp?.taxCode || '',
      companyName: comp?.companyName || '',
      dataFolder: comp?.dataFolder || ''
    };

    const mStr = String(month).padStart(2, '0');
    const expectedMonthFolder = `THANG ${mStr}.${year}`;

    return new Observable<ApiResponse<any>>(subscriber => {
      this.http.post<any>(`${this.baseUrl}/web-run-request`, payload).subscribe({
        next: async (initRes) => {
          const jobId = initRes.jobId;
          this.currentJobId.set(jobId);

          const ok = await this.uploadBatchFiles(files, jobId, expectedMonthFolder);
          if (!ok) {
            this.isRunningEngine.set(false);
            this.statusMessage.set('Lỗi khi nạp tệp lên phiên xử lý.');
            subscriber.next({ success: false, message: 'Không thể nạp tệp lên máy chủ.' } as any);
            subscriber.complete();
            return;
          }

          this.statusMessage.set('Đang xử lý và lập 9 file AMIS trên máy chủ...');
          try {
            await fetch(`${this.baseUrl}/sync/session-ready`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ jobId })
            });
            this.pollSessionStatus(jobId, companyId, subscriber, month, year);
          } catch (rErr: any) {
            this.isRunningEngine.set(false);
            this.statusMessage.set('Lỗi khi kích hoạt xử lý phiên.');
            subscriber.next({ success: false, message: rErr.message } as any);
            subscriber.complete();
          }
        },
        error: (err) => {
          this.isRunningEngine.set(false);
          this.statusMessage.set('Lỗi khi khởi tạo phiên làm việc trên VPS.');
          subscriber.next({ success: false, message: err.message || 'Lỗi kết nối máy chủ' } as any);
          subscriber.complete();
        }
      });
    });
  }

  // Quét chọn thư mục máy tính qua File System Access API
  async pickDirectoryFiles(): Promise<{ file: File; relPath: string }[] | null> {
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const rootHandle = await (window as any).showDirectoryPicker({
          id: 'amis_data_picker',
          mode: 'read'
        });

        const files: { file: File; relPath: string }[] = [];
        const scan = async (handle: any, currentPath: string) => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
              if (['.xlsx', '.xls', '.xml', '.pdf', '.csv'].includes(ext) && !entry.name.startsWith('~$')) {
                const f = await entry.getFile();
                const rel = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                files.push({ file: f, relPath: rel });
              }
            } else if (entry.kind === 'directory') {
              const sub = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              await scan(entry, sub);
            }
          }
        };

        await scan(rootHandle, rootHandle.name);
        return files;
      } catch (err: any) {
        if (err.name === 'AbortError') return null;
        console.warn('showDirectoryPicker error:', err);
        return null;
      }
    }
    return null;
  }

  private executeRemoteWebRun(companyId: number, month: number, year: number, comp: any, subscriber: any) {
    const payload = {
      companyId,
      month,
      year,
      taxCode: comp?.taxCode || '',
      companyName: comp?.companyName || '',
      dataFolder: comp?.dataFolder || ''
    };

    this.statusMessage.set('Đang yêu cầu Trợ lý gửi dữ liệu...');

    this.http.post<any>(`${this.baseUrl}/web-run-request`, payload).subscribe({
      next: initRes => {
        const jobId = initRes.jobId;
        this.currentJobId.set(jobId);
        this.pollSessionStatus(jobId, companyId, subscriber, month, year);
      },
      error: err => {
        this.isRunningEngine.set(false);
        this.statusMessage.set('Lỗi khi gửi yêu cầu tới máy chủ VPS.');
        subscriber.next({ success: false, message: err.message } as any);
        subscriber.complete();
      }
    });
  }

  private async executeBrowserDirectUpload(companyId: number, month: number, year: number, comp: any, subscriber: any) {
    const payload = {
      companyId,
      month,
      year,
      taxCode: comp?.taxCode || '',
      companyName: comp?.companyName || '',
      dataFolder: comp?.dataFolder || ''
    };

    this.statusMessage.set('Vui lòng chọn thư mục dữ liệu trên máy tính của bạn...');

    try {
      const initRes: any = await firstValueFrom(this.http.post<any>(`${this.baseUrl}/web-run-request`, payload));
      const jobId = initRes.jobId;
      this.currentJobId.set(jobId);

      const ok = await this.pickAndUploadFiles(jobId, month, year);
      if (!ok) {
        this.isRunningEngine.set(false);
        this.statusMessage.set('Đã hủy chọn thư mục.');
        subscriber.next({ success: false, message: 'Đã hủy chọn thư mục dữ liệu.' } as any);
        subscriber.complete();
        return;
      }

      this.statusMessage.set('Đang xử lý trên máy chủ VPS...');
      await fetch(`${this.baseUrl}/sync/session-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId })
      });

      this.pollSessionStatus(jobId, companyId, subscriber, month, year);
    } catch (err: any) {
      this.isRunningEngine.set(false);
      this.statusMessage.set('Lỗi khi tải dữ liệu lên phiên tạm.');
      subscriber.next({ success: false, message: err.message || 'Lỗi kết nối máy chủ' } as any);
      subscriber.complete();
    }
  }

  private async pickAndUploadFiles(jobId: string, month: number, year: number): Promise<boolean> {
    const mStr = String(month).padStart(2, '0');
    const expectedMonthFolder = `THANG ${mStr}.${year}`;

    // 1. Thử dùng Modern File System Access API (Google Chrome, Microsoft Edge)
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const rootHandle = await (window as any).showDirectoryPicker({
          id: 'amis_folder_picker',
          mode: 'read'
        });

        const files: { file: File; relPath: string }[] = [];
        const scan = async (handle: any, currentPath: string) => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const ext = entry.name.substring(entry.name.lastIndexOf('.')).toLowerCase();
              if (['.xlsx', '.xls', '.xml', '.pdf', '.csv'].includes(ext) && !entry.name.startsWith('~$')) {
                const f = await entry.getFile();
                const rel = currentPath ? `${currentPath}/${entry.name}` : entry.name;
                files.push({ file: f, relPath: rel });
              }
            } else if (entry.kind === 'directory') {
              const sub = currentPath ? `${currentPath}/${entry.name}` : entry.name;
              await scan(entry, sub);
            }
          }
        };

        await scan(rootHandle, rootHandle.name);

        if (files.length === 0) {
          alert(`Thư mục "${rootHandle.name}" không chứa tệp sao kê hoặc hóa đơn nào (.xlsx, .pdf, .xml).`);
          return false;
        }

        return await this.uploadBatchFiles(files, jobId, expectedMonthFolder);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return false;
        }
        console.warn('showDirectoryPicker error, falling back to input:', err);
      }
    }

    // 2. Fallback dùng hidden input[webkitdirectory]
    return new Promise<boolean>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.webkitdirectory = true;
      (input as any).directory = true;
      input.multiple = true;
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async () => {
        const fileList = input.files;
        if (!fileList || fileList.length === 0) {
          document.body.removeChild(input);
          resolve(false);
          return;
        }

        const files: { file: File; relPath: string }[] = [];
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
          if (['.xlsx', '.xls', '.xml', '.pdf', '.csv'].includes(ext) && !f.name.startsWith('~$')) {
            files.push({ file: f, relPath: f.webkitRelativePath || f.name });
          }
        }

        document.body.removeChild(input);
        if (files.length === 0) {
          alert('Không tìm thấy tệp sao kê hoặc hóa đơn hợp lệ trong thư mục đã chọn.');
          resolve(false);
          return;
        }

        const ok = await this.uploadBatchFiles(files, jobId, expectedMonthFolder);
        resolve(ok);
      };

      input.oncancel = () => {
        document.body.removeChild(input);
        resolve(false);
      };

      input.click();
    });
  }

  private async uploadBatchFiles(files: { file: File; relPath: string }[], jobId: string, expectedMonth: string): Promise<boolean> {
    this.statusMessage.set(`Đang nạp ${files.length} tệp lên phiên tạm thời...`);
    let uploaded = 0;

    for (const item of files) {
      let rel = item.relPath.replace(/\\/g, '/');
      const idx = rel.indexOf('5. DU LIEU');
      if (idx >= 0) {
        rel = rel.substring(idx);
      } else {
        rel = `5. DU LIEU/${rel}`;
      }

      const fd = new FormData();
      fd.append('file', item.file, item.file.name);
      fd.append('jobId', jobId);
      fd.append('relativePath', rel);

      try {
        const res = await fetch(`${this.baseUrl}/sync/session-upload`, {
          method: 'POST',
          body: fd
        });
        if (res.ok) uploaded++;
      } catch (e) {
        console.error('Lỗi tải tệp:', item.relPath, e);
      }
    }

    return uploaded > 0;
  }

  private pollSessionStatus(jobId: string, companyId: number, subscriber: any, month?: number, year?: number) {
    let pollCount = 0;
    const maxPolls = 120; // 120s timeout

    const interval = setInterval(() => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(interval);
        this.isRunningEngine.set(false);
        this.statusMessage.set('Quá thời gian xử lý trên máy chủ.');
        subscriber.next({ success: false, message: 'Quá thời gian xử lý trên máy chủ VPS.' } as any);
        subscriber.complete();
        return;
      }

      this.http.get<any>(`${this.baseUrl}/session-status/${jobId}`).subscribe({
        next: st => {
          if (st.message) this.statusMessage.set(st.message);
          if (st.status === 'COMPLETED') {
            clearInterval(interval);
            this.isRunningEngine.set(false);
            this.statusMessage.set('Lập file hoàn tất!');
            if (st.result?.logs) this.executionLog.set(st.result.logs);
            if (st.result?.files) this.generatedFiles.set(st.result.files);
            if (st.result?.reconciliation) this.reconciliation.set(st.result.reconciliation);
            this.loadTransactions(companyId).subscribe();

            // Tự động tải về gói kết quả ZIP cho người dùng
            if (month && year) {
              try {
                this.downloadAllZip(companyId, month, year);
              } catch (dlErr) {
                console.warn('Auto-download zip failed:', dlErr);
              }
            }

            subscriber.next({
              success: true,
              message: st.message,
              logs: st.result?.logs,
              files: st.result?.files,
              reconciliation: st.result?.reconciliation
            } as any);
            subscriber.complete();
          } else if (st.status === 'FAILED') {
            clearInterval(interval);
            this.isRunningEngine.set(false);
            this.statusMessage.set(st.message || 'Lập file thất bại.');
            if (st.result?.logs) this.executionLog.set(st.result.logs);
            subscriber.next({ success: false, message: st.message } as any);
            subscriber.complete();
          }
        },
        error: () => {}
      });
    }, 1000);
  }

  savePartnerAlias(companyId: number, rawName: string, partnerCode: string, note?: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/companies/${companyId}/save-alias`, {
      rawName,
      partnerCode,
      note
    });
  }

  openFolderOnHost(companyId: number, month: number, year: number, customFolder?: string): Observable<ApiResponse<any>> {
    const root = (this.isRemoteHost && this.isLocalAgentConnected()) ? this.localAgentUrl : this.baseUrl;
    return this.http.post<ApiResponse<any>>(`${root}/companies/${companyId}/open-folder?month=${month}&year=${year}`, { month, year, customFolder });
  }

  // Quản lý cấu hình thư mục lưu tệp tải về
  private readonly DOWNLOAD_SETTINGS_KEY = 'amis_download_folder_settings';

  getDownloadFolderSettings(): DownloadFolderSettings {
    try {
      const raw = localStorage.getItem(this.DOWNLOAD_SETTINGS_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {}
    return {
      folderPath: '',
      autoSave: false,
      openExplorerAfterDownload: true
    };
  }

  saveDownloadFolderSettings(settings: DownloadFolderSettings): void {
    try {
      localStorage.setItem(this.DOWNLOAD_SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  async browseFolderNative(initialPath?: string): Promise<string | null> {
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    if (isTauri) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<string | null>('pick_folder', { initialPath });
        if (res) return res;
      } catch (e) {
        console.warn('Tauri pick_folder failed:', e);
      }
    }

    // 1. Khi truy cập từ xa qua Web (VPS) -> Sử dụng showDirectoryPicker ngay trong luồng Click để tránh bị Chrome chặn
    if (this.isRemoteHost && !this.isLocalAgentConnected()) {
      if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
          if (dirHandle?.name) {
            return dirHandle.name;
          }
        } catch (err: any) {
          if (err?.name !== 'AbortError') console.warn('showDirectoryPicker error:', err);
        }
      }
      return null;
    }

    // 2. Chế độ Local (localhost) -> Gọi API máy tính để mở hộp thoại Windows chuẩn
    const agentEndpoint = (this.isRemoteHost && this.isLocalAgentConnected()) ? this.localAgentUrl : this.baseUrl;
    try {
      const res = await firstValueFrom(this.http.post<{ success: boolean; folderPath?: string }>(`${agentEndpoint}/browse-folder`, { path: initialPath }));
      if (res?.success && res.folderPath) {
        return res.folderPath;
      }
    } catch {}

    // Fallback: window.showDirectoryPicker (Chrome / Edge)
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({ mode: 'read' });
        if (dirHandle?.name) {
          return dirHandle.name;
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('showDirectoryPicker error:', err);
        }
      }
    }

    return null;
  }

  getSuggestedFolder(companyId: number, month: number, year: number): Observable<{ folderPath: string; downloadsFolder: string; desktopFolder: string }> {
    const root = (this.isRemoteHost && this.isLocalAgentConnected()) ? this.localAgentUrl : this.baseUrl;
    return this.http.get<{ success: boolean; folderPath: string; downloadsFolder: string; desktopFolder: string }>(
      `${root}/companies/${companyId}/results-folder-path?month=${month}&year=${year}`
    );
  }

  openPathLocally(path: string): Observable<boolean> {
    return new Observable(observer => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        import('@tauri-apps/api/core').then(({ invoke }) => {
          invoke<boolean>('open_path_in_explorer', { path })
            .then(() => {
              observer.next(true);
              observer.complete();
            })
            .catch(err => {
              console.warn('Tauri open_path_in_explorer failed:', err);
              observer.next(false);
              observer.complete();
            });
        });
        return;
      }

      const root = (this.isRemoteHost && this.isLocalAgentConnected()) ? this.localAgentUrl : this.baseUrl;
      this.http.post<any>(`${root}/open-path`, { path }).subscribe({
        next: (res) => {
          observer.next(res?.success ?? true);
          observer.complete();
        },
        error: (err) => {
          console.warn('Lỗi mở thư mục cục bộ:', err);
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  // Tải Blob và lưu trực tiếp vào thư mục chỉ định, sau đó mở thư mục
  saveBlobToFolder(blob: Blob, fileName: string, folderPath: string, openExplorer: boolean = true): Observable<{ success: boolean; filePath?: string; message?: string }> {
    return new Observable(observer => {
      const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
      if (isTauri) {
        blob.arrayBuffer().then(buffer => {
          import('@tauri-apps/api/core').then(({ invoke }) => {
            invoke<string>('save_and_open_file', {
              folderPath,
              fileName,
              bytes: Array.from(new Uint8Array(buffer)),
              openExplorer
            }).then(fullPath => {
              this.toastNotification.set(`Đã lưu tệp vào: ${fullPath}`);
              observer.next({ success: true, filePath: fullPath });
              observer.complete();
            }).catch(err => {
              console.warn('Tauri save_and_open_file failed:', err);
              this.fallbackBrowserDownload(blob, fileName);
              observer.next({ success: false, message: String(err) });
              observer.complete();
            });
          });
        });
        return;
      }

      // Check if local agent or local server is reachable
      const root = (this.isRemoteHost && this.isLocalAgentConnected()) ? this.localAgentUrl : this.baseUrl;
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        this.http.post<any>(`${root}/save-and-open-file`, {
          folderPath,
          fileName,
          fileData: base64Data,
          openExplorer
        }).subscribe({
          next: (res) => {
            const pathSaved = res?.filePath || `${folderPath}\\${fileName}`;
            this.toastNotification.set(`Đã lưu tệp vào: ${pathSaved}`);
            observer.next({ success: true, filePath: pathSaved });
            observer.complete();
          },
          error: (err) => {
            console.warn('Lưu file qua server thất bại, tải qua trình duyệt:', err);
            this.fallbackBrowserDownload(blob, fileName);
            observer.next({ success: false, message: 'Đã tải qua trình duyệt' });
            observer.complete();
          }
        });
      };
      reader.readAsDataURL(blob);
    });
  }

  fallbackBrowserDownload(blob: Blob, filename: string): void {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    this.toastNotification.set(`Đã tải xuống thành công: ${filename}`);
  }

  // Tải dữ liệu Blob từ URL để phục vụ lưu vào thư mục
  fetchBlob(url: string, defaultFilename: string): Observable<{ blob: Blob; filename: string }> {
    return new Observable(observer => {
      const serverFallbackUrl = url.includes('localhost:9093') ? url.replace('http://localhost:9093/api/accounting', this.baseUrl) : undefined;

      const execute = (targetUrl: string, fallback?: string) => {
        this.http.get(targetUrl, { responseType: 'blob', observe: 'response' }).subscribe({
          next: (res) => {
            const blob = res.body;
            if (!blob) {
              if (fallback) {
                execute(fallback);
                return;
              }
              this.toastNotification.set('Tệp tải về bị trống.');
              observer.error(new Error('Tệp trống'));
              return;
            }
            let filename = defaultFilename;
            const disp = res.headers.get('content-disposition');
            if (disp) {
              const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disp);
              if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
              }
            }
            observer.next({ blob, filename });
            observer.complete();
          },
          error: async (err) => {
            if (fallback) {
              execute(fallback);
              return;
            }
            let errorMsg = 'Thư mục kết quả hiện chưa có tệp Excel nào. Vui lòng bấm LẬP FILE trước!';
            if (err.error instanceof Blob) {
              try {
                const text = await err.error.text();
                if (text && text.trim().length > 0) {
                  errorMsg = text.replace(/<[^>]*>/g, '').trim();
                }
              } catch {}
            } else if (err.error?.message) {
              errorMsg = err.error.message;
            } else if (typeof err.error === 'string' && err.error.length > 0) {
              errorMsg = err.error;
            } else if (err.message) {
              errorMsg = err.message;
            }
            this.toastNotification.set(errorMsg);
            observer.error(new Error(errorMsg));
          }
        });
      };

      execute(url, serverFallbackUrl);
    });
  }

  getDownloadResultsZipUrl(companyId: number, month: number, year: number): string {
    const jId = this.currentJobId();
    if (this.isRemoteHost && jId) {
      return `${this.baseUrl}/session/${jId}/download-zip`;
    }
    return `${this.baseUrl}/companies/${companyId}/download-results-zip?month=${month}&year=${year}`;
  }

  downloadAllZip(companyId: number, month: number, year: number): void {
    const url = this.getDownloadResultsZipUrl(companyId, month, year);
    this.downloadBlob(url, `Ket_Qua_AMIS_Thang${String(month).padStart(2, '0')}_${year}.zip`).subscribe();
  }

  getDownloadFileUrl(companyId: number, fileName: string, month: number, year: number): string {
    const jId = this.currentJobId();
    if (this.isRemoteHost && jId) {
      return `${this.baseUrl}/session/${jId}/download-file?fileName=${encodeURIComponent(fileName)}`;
    }
    return `${this.baseUrl}/companies/${companyId}/download-file?fileName=${encodeURIComponent(fileName)}&month=${month}&year=${year}`;
  }

  getDownloadNoteFileUrl(companyId: number, month: number, year: number): string {
    return `${this.baseUrl}/companies/${companyId}/download-note-file?month=${month}&year=${year}`;
  }

  // Tải file an toàn qua Blob (Không bao giờ chuyển trang hay mở tab trắng)
  downloadBlob(url: string, defaultFilename: string): Observable<boolean> {
    return new Observable(observer => {
      const serverFallbackUrl = url.includes('localhost:9093') ? url.replace('http://localhost:9093/api/accounting', this.baseUrl) : undefined;

      const executeDownload = (targetUrl: string, fallback?: string) => {
        this.http.get(targetUrl, { responseType: 'blob', observe: 'response' }).subscribe({
          next: (res) => {
            const blob = res.body;
            if (!blob) {
              if (fallback) {
                executeDownload(fallback);
                return;
              }
              this.toastNotification.set('Tệp tải về bị trống.');
              observer.error(new Error('Tệp trống'));
              return;
            }
            let filename = defaultFilename;
            const disp = res.headers.get('content-disposition');
            if (disp) {
              const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disp);
              if (match && match[1]) {
                filename = match[1].replace(/['"]/g, '');
              }
            }
            // Lưu file vào thư mục (Downloads hoặc thư mục cấu hình) và tự động mở thư mục/File Explorer
            const settings = this.getDownloadFolderSettings();
            const targetFolder = settings.folderPath?.trim() || '';

            this.saveBlobToFolder(blob, filename, targetFolder, true).subscribe({
              next: (saveRes) => {
                if (saveRes.success) {
                  this.toastNotification.set(`Đã tải xuống và mở thư mục: ${saveRes.filePath || filename}`);
                }
                observer.next(true);
                observer.complete();
              },
              error: () => {
                this.fallbackBrowserDownload(blob, filename);
                observer.next(true);
                observer.complete();
              }
            });
          },
          error: async (err) => {
            if (fallback) {
              executeDownload(fallback);
              return;
            }
            let errorMsg = 'Thư mục kết quả hiện chưa có tệp Excel nào. Vui lòng bấm LẬP FILE trước!';
            if (err.error instanceof Blob) {
              try {
                const text = await err.error.text();
                if (text && text.trim().length > 0) {
                  errorMsg = text.replace(/<[^>]*>/g, '').trim();
                }
              } catch {}
            } else if (err.error?.message) {
              errorMsg = err.error.message;
            } else if (typeof err.error === 'string' && err.error.length > 0) {
              errorMsg = err.error;
            } else if (err.message) {
              errorMsg = err.message;
            }

            console.warn('Lỗi khi tải file:', errorMsg);
            this.toastNotification.set(errorMsg);
            observer.error(new Error(errorMsg));
          }
        });
      };

      executeDownload(url, serverFallbackUrl);
    });
  }

  getInvoicePdfUrl(companyId: number, fileName: string, type: string, month: number, year: number): string {
    return `${this.baseUrl}/companies/${companyId}/invoices/download-pdf?fileName=${encodeURIComponent(fileName)}&type=${type}&month=${month}&year=${year}`;
  }

  // ==========================================
  // Module 1: Soạn thảo văn bản & Hợp đồng tự động
  // ==========================================
  loadContractTemplates(): Observable<ApiResponse<ContractTemplate[]>> {
    return this.http.get<ApiResponse<ContractTemplate[]>>(`${this.baseUrl}/contracts/templates`).pipe(
      tap(res => {
        if (res.success) this.contractTemplates.set(res.data);
      })
    );
  }

  loadContracts(companyId: number): Observable<ApiResponse<ContractDocument[]>> {
    return this.http.get<ApiResponse<ContractDocument[]>>(`${this.baseUrl}/companies/${companyId}/contracts`).pipe(
      tap(res => {
        if (res.success) this.contracts.set(res.data);
      })
    );
  }

  generateContract(req: GenerateContractRequest): Observable<ApiResponse<ContractDocument>> {
    return this.http.post<ApiResponse<ContractDocument>>(`${this.baseUrl}/contracts/generate`, req).pipe(
      tap(() => this.loadContracts(req.companyId).subscribe())
    );
  }

  deleteContract(contractId: number, companyId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/contracts/${contractId}`).pipe(
      tap(() => this.loadContracts(companyId).subscribe())
    );
  }

  getDownloadContractUrl(contractId: number): string {
    return `${this.baseUrl}/contracts/${contractId}/download`;
  }

  // ==========================================
  // Module 2: Dự kiến thu chi & Phê duyệt chi
  // ==========================================
  loadCashFlowPlans(companyId: number, month: number, year: number): Observable<ApiResponse<CashFlowPlan[]>> {
    return this.http.get<ApiResponse<CashFlowPlan[]>>(`${this.baseUrl}/companies/${companyId}/cashflow?month=${month}&year=${year}`).pipe(
      tap(res => {
        if (res.success) this.cashFlowPlans.set(res.data);
      })
    );
  }

  saveCashFlowPlan(companyId: number, dto: Partial<CashFlowPlan>): Observable<ApiResponse<CashFlowPlan>> {
    return this.http.post<ApiResponse<CashFlowPlan>>(`${this.baseUrl}/companies/${companyId}/cashflow`, dto).pipe(
      tap(() => this.loadCashFlowPlans(companyId, this.selectedMonth(), this.selectedYear()).subscribe())
    );
  }

  deleteCashFlowPlan(id: number, companyId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/cashflow/${id}`).pipe(
      tap(() => this.loadCashFlowPlans(companyId, this.selectedMonth(), this.selectedYear()).subscribe())
    );
  }

  approveCashFlowPlan(id: number, req: ApproveCashFlowRequest, companyId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/cashflow/${id}/approve`, req).pipe(
      tap(() => {
        this.loadCashFlowPlans(companyId, this.selectedMonth(), this.selectedYear()).subscribe();
        if (req.autoGenerateContract) {
          this.loadContracts(companyId).subscribe();
        }
      })
    );
  }

  // ==========================================
  // Module 3: Cổng giao tiếp khách hàng & Trợ lý thông minh
  // ==========================================
  loadCustomerDebts(companyId: number): Observable<ApiResponse<CustomerDebt[]>> {
    return this.http.get<ApiResponse<CustomerDebt[]>>(`${this.baseUrl}/companies/${companyId}/customer-debts`).pipe(
      tap(res => {
        if (res.success) this.customerDebts.set(res.data);
      })
    );
  }

  loadInventory(companyId: number): Observable<ApiResponse<InventoryItem[]>> {
    return this.http.get<ApiResponse<InventoryItem[]>>(`${this.baseUrl}/companies/${companyId}/inventory`).pipe(
      tap(res => {
        if (res.success) this.inventoryItems.set(res.data);
      })
    );
  }

  sendCustomerQuery(companyId: number, query: string, customerCode?: string): Observable<ApiResponse<CustomerQueryResponse>> {
    const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    this.customerChatMessages.update(msgs => [
      ...msgs,
      { sender: 'user', text: query, time: timeNow }
    ]);

    return this.http.post<ApiResponse<CustomerQueryResponse>>(`${this.baseUrl}/customer-query`, {
      companyId,
      query,
      customerCode
    }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.customerChatMessages.update(msgs => [
            ...msgs,
            { sender: 'assistant', text: res.data.answer, time: timeNow, data: res.data.data }
          ]);
        }
      })
    );
  }
}
