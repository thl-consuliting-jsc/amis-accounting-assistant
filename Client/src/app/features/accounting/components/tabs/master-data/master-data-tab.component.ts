import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorMagnifyingGlass,
  phosphorPencilSimple,
  phosphorPlus,
  phosphorTrash
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';
import { Partner } from '../../../models/accounting.model';

@Component({
  selector: 'app-master-data-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './master-data-tab.component.html',
  styleUrl: './master-data-tab.component.scss'
})
export class MasterDataTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly createPartner = output<void>();
  public readonly editPartner = output<Partner>();
  public readonly deletePartner = output<number>();

  // Icons
  protected readonly plusIcon = phosphorPlus;
  protected readonly searchIcon = phosphorMagnifyingGlass;
  protected readonly editIcon = phosphorPencilSimple;
  protected readonly trashIcon = phosphorTrash;

  // Filters State
  public readonly partnerSearchTerm = signal<string>('');
  public readonly partnerTypeFilter = signal<'ALL' | 'KH' | 'NCC' | 'NV'>('ALL');

  // Filtered partners computed
  public readonly filteredPartners = computed(() => {
    let list = this.svc.partners();
    const type = this.partnerTypeFilter();
    if (type !== 'ALL') {
      list = list.filter(p => p.partnerType === type);
    }
    const q = this.partnerSearchTerm().toLowerCase().trim();
    if (q) {
      list = list.filter(p =>
        p.partnerName.toLowerCase().includes(q) ||
        p.partnerCode.toLowerCase().includes(q) ||
        (p.taxCode && p.taxCode.toLowerCase().includes(q))
      );
    }
    return list;
  });
}
