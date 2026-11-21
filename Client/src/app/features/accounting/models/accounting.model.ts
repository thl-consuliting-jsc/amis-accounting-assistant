export interface Company {
  id: number;
  tenantId: number;
  taxCode: string;
  companyName: string;
  name?: string;
  companyAddress?: string;
  address?: string;
  dataFolder?: string;
  rulesPath?: string;
  fiscalYear: number;
  autoFindPartner: boolean;
  bankAccountCount?: number;
  ruleCount?: number;
  partnerCount?: number;
}

export interface BankAccount {
  id: number;
  companyId: number;
  bankProfileId: number;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  glAccount: string;
  voucherPrefixReceipt: string;
  voucherPrefixPayment: string;
  initialBalance: number;
  currentBalance: number;
  isActive: boolean;
}

export interface AccountingRule {
  id: number;
  companyId: number;
  priority: number;
  ruleName: string;
  transactionDirection: 'IN' | 'OUT' | 'ALL';
  keywords: string;
  excludeKeywords?: string;
  partnerKeywords?: string;
  partnerCode?: string;
  partnerName?: string;
  debitAccount: string;
  creditAccount: string;
  descriptionPattern?: string;
  isInternalTransfer: boolean;
  isCardPayment: boolean;
  isCcdc: boolean;
  ruleType: string;
  note?: string;
  isActive: boolean;
}

export interface BankTransaction {
  id: number;
  batchId: number;
  bankAccountId: number;
  bankName: string;
  accountNumber: string;
  transactionDate: string;
  refNo?: string;
  amount: number;
  direction: 'IN' | 'OUT';
  description: string;
  partnerNameRaw?: string;
  balanceAfter: number;
  debitAccount?: string;
  creditAccount?: string;
  partnerCode?: string;
  partnerName?: string;
  finalDescription?: string;
  voucherNo?: string;
  voucherType?: string;
  status: 'Matched' | 'Unclassified' | 'Ignored' | 'PendingReview';
  notes?: string;
}

export interface BankReconciliationSummary {
  bankAccountId: number;
  bankName: string;
  accountNumber: string;
  glAccount: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  internalTransferIn?: number;
  internalTransferOut?: number;
  calculatedClosingBalance: number;
  statementClosingBalance: number;
  difference: number;
  isMatched: boolean;
}

export interface ReconciliationSummary {
  batchId: number;
  periodName: string;
  status: string;
  isReconciled: boolean;
  summaryNotes?: string;
  accounts: BankReconciliationSummary[];
}

export interface GeneratedFile {
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  formattedSize: string;
  amisTarget: string;
  description: string;
  lastModified?: string;
  exists?: boolean;
  downloadUrl?: string;
}

export interface Partner {
  id: number;
  companyId: number;
  partnerCode: string;
  partnerName: string;
  normalizedName?: string;
  taxCode?: string;
  partnerType: 'KH' | 'NCC' | 'NV' | 'KH_NCC';
  defaultDebitAccount?: string;
  defaultCreditAccount?: string;
}

export interface Invoice {
  id: number;
  companyId?: number;
  invoiceNo: string;
  invoiceSymbol?: string;
  invoiceDate: string;
  partnerCode: string;
  partnerName: string;
  taxCode: string;
  itemName?: string;
  taxRate?: string;
  preTaxAmount: number;
  taxAmount: number;
  totalAmount: number;
  debitAccount: string;
  creditAccount: string;
  invoiceType: 'IN' | 'OUT';
  status: string;
  note?: string;
  pdfFileName?: string;
  hasPdf?: boolean;
  lookupUrl?: string;
  lookupCode?: string;
  rawFileSource?: string;
  month?: number;
  year?: number;
}

// 1. Soạn thảo văn bản & Hợp đồng tự động
export interface ContractTemplate {
  code: string;
  name: string;
  category: string;
  description: string;
  requiredFields: string[];
}

export interface ContractDocument {
  id: number;
  companyId: number;
  contractCode: string;
  title: string;
  templateCode: string;
  templateName?: string;
  category: string;
  partnerName: string;
  partnerTaxCode: string;
  partnerAddress: string;
  representative: string;
  contractValue: number;
  signDate: string;
  effectiveDate?: string;
  expireDate?: string;
  status: 'Draft' | 'Signed' | 'Expired';
  contentHtml?: string;
  fileName?: string;
  createdAt: string;
}

export interface GenerateContractRequest {
  companyId: number;
  templateCode: string;
  title: string;
  partnerName: string;
  partnerTaxCode: string;
  partnerAddress: string;
  representative: string;
  position: string;
  contractValue: number;
  signDate: string;
  effectiveDate?: string;
  expireDate?: string;
  details: string;
  cashFlowId?: number;
}

// 2. Dự kiến thu chi & Phê duyệt chi
export interface CashFlowPlan {
  id: number;
  companyId: number;
  month: number;
  year: number;
  title: string;
  flowType: 'REVENUE' | 'EXPENSE';
  category: string;
  estimatedAmount: number;
  actualAmount: number;
  source: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  note?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  generatedContractId?: number;
  contractCode?: string;
}

export interface ApproveCashFlowRequest {
  status: 'Approved' | 'Rejected';
  approverName?: string;
  note?: string;
  autoGenerateContract: boolean;
}

// 3. Cổng giao tiếp khách hàng & Trợ lý thông minh
export interface CustomerDebt {
  customerCode: string;
  customerName: string;
  taxCode: string;
  debtType?: string;
  beginningDebt?: number;
  openingBalance?: number;
  increaseDebt?: number;
  debitAmount?: number;
  decreaseDebt?: number;
  creditAmount?: number;
  endingDebt?: number;
  closingBalance?: number;
  unpaidInvoiceCount?: number;
  status: string;
}

export interface InventoryItem {
  itemCode: string;
  itemName: string;
  unit: string;
  openingQuantity?: number;
  inQuantity?: number;
  outQuantity?: number;
  closingQuantity?: number;
  quantity?: number;
  unitPrice: number;
  totalValue: number;
  warehouse: string;
  status: string;
}

export interface CustomerQueryResponse {
  answer: string;
  queryType: string;
  data?: any;
}

export interface CcdcItem {
  id: number;
  companyId?: number;
  code: string;
  name: string;
  originalPrice: number;
  allocationPeriods: number;
  invoiceRef: string;
  unit: string;
}

export interface VatIndicator {
  code: string;
  description: string;
  amount: number;
  taxAmount: number;
  note: string;
}

export interface DownloadFolderSettings {
  folderPath: string;
  autoSave: boolean;
  openExplorerAfterDownload: boolean;
}
