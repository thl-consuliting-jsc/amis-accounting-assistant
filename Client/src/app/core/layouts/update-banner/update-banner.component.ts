import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UpdateService } from '../../services/update.service';
import { AccountingService } from '../../../features/accounting/services/accounting.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-banner.component.html',
  styleUrls: ['./update-banner.component.scss']
})
export class UpdateBannerComponent implements OnInit {
  readonly svc = inject(UpdateService);
  private readonly accountingSvc = inject(AccountingService);

  ngOnInit(): void {
    // 1. Kiểm tra xem có dữ liệu cần khôi phục sau update trước đó không
    const restoredState = this.svc.restoreBackupAfterUpdate();
    if (restoredState) {
      console.log('Restored user state after update:', restoredState);
      if (restoredState.companyId && this.accountingSvc.companies().length > 0) {
        const found = this.accountingSvc.companies().find(c => c.id === restoredState.companyId);
        if (found) this.accountingSvc.selectCompany(found);
      }
      if (restoredState.month) this.accountingSvc.selectedMonth.set(restoredState.month);
      if (restoredState.year) this.accountingSvc.selectedYear.set(restoredState.year);

      // Hiển thị thông báo đã khôi phục thành công
      this.accountingSvc.statusMessage.set('Đã cập nhật phiên bản mới & bảo toàn 100% dữ liệu làm việc của bạn!');
    }

    // 2. Kiểm tra bản cập nhật mới sau 2 giây
    setTimeout(() => this.svc.checkUpdate(), 2000);
  }

  startUpdate(): void {
    // Thu thập trạng thái hiện tại của người dùng để sao lưu trước khi update
    const currentState = {
      companyId: this.accountingSvc.selectedCompany()?.id,
      month: this.accountingSvc.selectedMonth(),
      year: this.accountingSvc.selectedYear(),
      backupTime: new Date().toISOString()
    };

    this.svc.downloadAndInstallWithBackup(() => currentState);
  }
}
