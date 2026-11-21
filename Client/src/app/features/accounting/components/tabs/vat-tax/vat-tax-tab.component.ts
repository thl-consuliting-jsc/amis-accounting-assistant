import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountingService } from '../../../services/accounting.service';

@Component({
  selector: 'app-vat-tax-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './vat-tax-tab.component.html',
  styleUrl: './vat-tax-tab.component.scss'
})
export class VatTaxTabComponent {
  public readonly svc = inject(AccountingService);
}
