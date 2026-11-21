import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorPencilSimple,
  phosphorPlus,
  phosphorTrash
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { BankTransaction } from '../../../models/accounting.model';

@Component({
  selector: 'app-banking-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './banking-tab.component.html',
  styleUrl: './banking-tab.component.scss'
})
export class BankingTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly createBankAccount = output<void>();
  public readonly createTransaction = output<void>();
  public readonly editTransaction = output<BankTransaction>();
  public readonly deleteTransaction = output<number>();

  // Icons
  protected readonly plusIcon = phosphorPlus;
  protected readonly editIcon = phosphorPencilSimple;
  protected readonly trashIcon = phosphorTrash;

  // Filters & Selection State
  public readonly bankFilter = signal<string>('ALL');
  public readonly statusFilter = signal<string>('ALL');
  public readonly showAllVouchers = signal<boolean>(true);
  public readonly selectedTransaction = signal<BankTransaction | null>(null);

  // Partner Alias Assignment State
  public readonly aliasPartnerCode = signal<string>('');
  public readonly aliasNoticeMessage = signal<string>('');
  public readonly aliasNoticeType = signal<'success' | 'error' | 'info'>('info');

  // Computed Filtered List
  public readonly filteredTransactions = computed(() => {
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

  public selectTransaction(t: BankTransaction): void {
    this.selectedTransaction.set(t);
    this.aliasPartnerCode.set(t.partnerCode === 'KR' || !t.partnerCode ? '' : t.partnerCode);
    this.aliasNoticeMessage.set('');
  }

  public suggestNewPartnerCode(): void {
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

  public savePartnerAlias(): void {
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
      next: () => {
        this.aliasNoticeType.set('success');
        this.aliasNoticeMessage.set(`Đã lưu mã ${code} cho "${raw}". Các tháng sau tự động nhận diện.`);
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

  public deleteTx(id: number): void {
    if (!confirm('Bạn có chắc muốn xóa giao dịch này?')) return;
    this.svc.deleteTransaction(id).subscribe({
      next: () => {
        if (this.selectedTransaction()?.id === id) {
          this.selectedTransaction.set(null);
        }
        this.deleteTransaction.emit(id);
      },
      error: (err) => {
        alert('Lỗi khi xóa giao dịch: ' + (err.error?.message || err.message));
      }
    });
  }
}
