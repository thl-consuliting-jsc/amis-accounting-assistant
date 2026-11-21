import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorDownloadSimple,
  phosphorPlus,
  phosphorArrowsClockwise
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { Invoice } from '../../../models/accounting.model';

@Component({
  selector: 'app-purchases-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './purchases-tab.component.html',
  styleUrl: './purchases-tab.component.scss'
})
export class PurchasesTabComponent {
  public readonly svc = inject(AccountingService);

  // Inputs
  public readonly selectedMonth = input<number>(10);
  public readonly selectedYear = input<number>(2026);

  // Outputs
  public readonly refreshInvoices = output<void>();
  public readonly createInvoice = output<'IN' | 'OUT'>();
  public readonly downloadPdf = output<Invoice>();

  // Icons
  protected readonly syncIcon = phosphorArrowsClockwise;
  protected readonly plusIcon = phosphorPlus;
  protected readonly downloadIcon = phosphorDownloadSimple;
}
