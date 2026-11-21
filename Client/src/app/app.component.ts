import { Component } from '@angular/core';
import { AccountingDashboardComponent } from './features/accounting/components/accounting-dashboard/accounting-dashboard.component';
import { UpdateBannerComponent } from './core/layouts/update-banner/update-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    AccountingDashboardComponent,
    UpdateBannerComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {}
