import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import {
  phosphorArchive,
  phosphorBank,
  phosphorUsers
} from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';

@Component({
  selector: 'app-customer-portal-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon],
  templateUrl: './customer-portal-tab.component.html',
  styleUrl: './customer-portal-tab.component.scss'
})
export class CustomerPortalTabComponent {
  public readonly svc = inject(AccountingService);

  // Icons
  protected readonly bankIcon = phosphorBank;
  protected readonly archiveIcon = phosphorArchive;
  protected readonly usersIcon = phosphorUsers;

  // Subtabs State
  public readonly customerPortalTab = signal<'cong-no' | 'ton-kho' | 'tro-ly'>('cong-no');

  // AI Chat State
  public readonly customerChatInput = signal<string>('');
  public readonly isSendingQuery = signal<boolean>(false);

  public sendCustomerMessage(): void {
    const text = this.customerChatInput().trim();
    if (!text || this.isSendingQuery()) return;

    const comp = this.svc.selectedCompany();
    if (!comp) return;

    this.isSendingQuery.set(true);
    this.customerChatInput.set('');

    this.svc.sendCustomerQuery(comp.id, text).subscribe({
      next: () => {
        this.isSendingQuery.set(false);
      },
      error: () => {
        this.isSendingQuery.set(false);
      }
    });
  }

  public askSampleQuestion(q: string): void {
    this.customerChatInput.set(q);
    this.sendCustomerMessage();
  }
}
