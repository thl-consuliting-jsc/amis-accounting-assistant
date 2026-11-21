import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorBank,
  phosphorChartLine,
  phosphorCheckCircle,
  phosphorDownloadSimple,
  phosphorFileText,
  phosphorFolder,
  phosphorInfo,
  phosphorMoney,
  phosphorShoppingCart,
  phosphorTag,
  phosphorWarningCircle
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { GeneratedFile } from '../../../models/accounting.model';

@Component({
  selector: 'app-overview-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './overview-tab.component.html',
  styleUrl: './overview-tab.component.scss'
})
export class OverviewTabComponent {
  public readonly svc = inject(AccountingService);

  // Inputs
  public readonly selectedMonth = input<number>(10);
  public readonly selectedYear = input<number>(2026);

  // Outputs
  public readonly openUploadModal = output<void>();
  public readonly downloadAllZip = output<void>();
  public readonly openFile = output<GeneratedFile>();

  // Phosphor Icons
  protected readonly infoIcon = phosphorInfo;
  protected readonly folderIcon = phosphorFolder;
  protected readonly moneyIcon = phosphorMoney;
  protected readonly tagIcon = phosphorTag;
  protected readonly cartIcon = phosphorShoppingCart;
  protected readonly chartLineIcon = phosphorChartLine;
  protected readonly bankIcon = phosphorBank;
  protected readonly checkCircleIcon = phosphorCheckCircle;
  protected readonly warningIcon = phosphorWarningCircle;
  protected readonly downloadIcon = phosphorDownloadSimple;
  protected readonly fileTextIcon = phosphorFileText;
}
