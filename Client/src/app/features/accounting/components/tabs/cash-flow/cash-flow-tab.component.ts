import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorArrowDownLeft,
  phosphorArrowUpRight,
  phosphorBank,
  phosphorChartLine,
  phosphorCheckCircle,
  phosphorPlus,
  phosphorTrash,
  phosphorWarningCircle,
  phosphorX
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { CashFlowPlan } from '../../../models/accounting.model';

@Component({
  selector: 'app-cash-flow-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './cash-flow-tab.component.html',
  styleUrl: './cash-flow-tab.component.scss'
})
export class CashFlowTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly openCashFlowModal = output<void>();

  // Icons
  protected readonly chartLineIcon = phosphorChartLine;
  protected readonly plusIcon = phosphorPlus;
  protected readonly inIcon = phosphorArrowDownLeft;
  protected readonly outIcon = phosphorArrowUpRight;
  protected readonly bankIcon = phosphorBank;
  protected readonly warningIcon = phosphorWarningCircle;
  protected readonly checkCircleIcon = phosphorCheckCircle;
  protected readonly closeIcon = phosphorX;
  protected readonly trashIcon = phosphorTrash;

  // Filter State
  public readonly cashFlowFilter = signal<'ALL' | 'Pending' | 'Approved' | 'Rejected'>('ALL');

  // Computed KPIs
  public readonly filteredCashFlowPlans = computed(() => {
    const plans = this.svc.cashFlowPlans();
    const filter = this.cashFlowFilter();
    if (filter === 'ALL') return plans;
    return plans.filter(p => p.status === filter);
  });

  public readonly totalEstimatedRevenue = computed(() => {
    return this.svc.cashFlowPlans()
      .filter(p => p.flowType === 'REVENUE')
      .reduce((sum, p) => sum + p.estimatedAmount, 0);
  });

  public readonly totalEstimatedExpense = computed(() => {
    return this.svc.cashFlowPlans()
      .filter(p => p.flowType === 'EXPENSE')
      .reduce((sum, p) => sum + p.estimatedAmount, 0);
  });

  public readonly netEstimatedCashFlow = computed(() => {
    return this.totalEstimatedRevenue() - this.totalEstimatedExpense();
  });

  public readonly pendingCashFlowCount = computed(() => {
    return this.svc.cashFlowPlans().filter(p => p.status === 'Pending').length;
  });

  public approveItem(item: CashFlowPlan, autoContract: boolean = false): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    this.svc.approveCashFlowPlan(item.id, {
      status: 'Approved',
      approverName: 'Ban Giám Đốc',
      autoGenerateContract: autoContract
    }, comp.id).subscribe({
      next: (res) => {
        if (autoContract && res?.data?.generatedContractId) {
          const downloadUrl = this.svc.getDownloadContractUrl(res.data.generatedContractId);
          this.svc.downloadBlob(downloadUrl, `HopDong_${res.data.contractCode || item.id}.doc`).subscribe();
        }
      }
    });
  }

  public rejectItem(item: CashFlowPlan): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    this.svc.approveCashFlowPlan(item.id, {
      status: 'Rejected',
      approverName: 'Ban Giám Đốc',
      autoGenerateContract: false
    }, comp.id).subscribe();
  }

  public deleteItem(id: number): void {
    const comp = this.svc.selectedCompany();
    if (!comp) return;
    if (!confirm('Xóa khoản dự thu chi này?')) return;
    this.svc.deleteCashFlowPlan(id, comp.id).subscribe();
  }
}
