import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorPencilSimple,
  phosphorPlus,
  phosphorTrash,
  phosphorWrench
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { CcdcItem } from '../../../models/accounting.model';

@Component({
  selector: 'app-tools-supplies-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './tools-supplies-tab.component.html',
  styleUrl: './tools-supplies-tab.component.scss'
})
export class ToolsSuppliesTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly createCcdc = output<void>();
  public readonly editCcdc = output<CcdcItem>();
  public readonly deleteCcdc = output<number>();

  // Icons
  protected readonly wrenchIcon = phosphorWrench;
  protected readonly plusIcon = phosphorPlus;
  protected readonly editIcon = phosphorPencilSimple;
  protected readonly trashIcon = phosphorTrash;
}
