import { CommonModule } from '@angular/common';
import { Component, inject, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { phosphorCopy } from '@ng-icons/phosphor-icons/regular';
import { AccountingService } from '../../../services/accounting.service';

@Component({
  selector: 'app-audit-logs-tab',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './audit-logs-tab.component.html',
  styleUrl: './audit-logs-tab.component.scss'
})
export class AuditLogsTabComponent {
  public readonly svc = inject(AccountingService);

  // Outputs
  public readonly copyLogs = output<void>();

  // Icons
  protected readonly copyIcon = phosphorCopy;
}
