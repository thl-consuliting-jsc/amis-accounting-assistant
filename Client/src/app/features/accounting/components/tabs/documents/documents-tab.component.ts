import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorCheckCircle,
  phosphorDownloadSimple,
  phosphorFileText,
  phosphorPencilSimple,
  phosphorPlus,
  phosphorTrash
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { ContractDocument } from '../../../models/accounting.model';

@Component({
  selector: 'app-documents-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './documents-tab.component.html',
  styleUrl: './documents-tab.component.scss'
})
export class DocumentsTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly openContractModal = output<string | undefined>();
  public readonly downloadDoc = output<ContractDocument>();
  public readonly deleteDoc = output<number>();

  // Icons
  protected readonly fileTextIcon = phosphorFileText;
  protected readonly plusIcon = phosphorPlus;
  protected readonly editIcon = phosphorPencilSimple;
  protected readonly checkCircleIcon = phosphorCheckCircle;
  protected readonly downloadIcon = phosphorDownloadSimple;
  protected readonly trashIcon = phosphorTrash;
}
