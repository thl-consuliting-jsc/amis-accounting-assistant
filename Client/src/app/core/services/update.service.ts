import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { environment } from '../../../environments/environment';

export type UpdateState =
    | 'idle'
    | 'checking'
    | 'available'
    | 'backing_up'
    | 'downloading'
    | 'ready'
    | 'error';

export interface AppVersionInfo {
    version: string;
    releaseDate: string;
    notes: string;
    mandatory?: boolean;
}

export const PRE_UPDATE_BACKUP_KEY = 'ACCOUNTING_PRE_UPDATE_BACKUP_V1';
export const CURRENT_CLIENT_VERSION = '2.5.0';

@Injectable({ providedIn: 'root' })
export class UpdateService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl || 'http://localhost:9093/api';

    // State signals
    readonly state = signal<UpdateState>('idle');
    readonly tauriUpdate = signal<Update | null>(null);
    readonly webUpdate = signal<AppVersionInfo | null>(null);
    readonly progress = signal<number>(0);
    readonly statusStepText = signal<string>('');
    readonly errorMsg = signal<string>('');
    readonly backupNotice = signal<string>('');

    // Computed
    readonly hasUpdate = computed(() => this.tauriUpdate() !== null || this.webUpdate() !== null);
    readonly updateVersion = computed(() => {
        if (this.tauriUpdate()) return this.tauriUpdate()!.version;
        if (this.webUpdate()) return this.webUpdate()!.version;
        return '';
    });
    readonly updateNotes = computed(() => {
        if (this.tauriUpdate()) return this.tauriUpdate()!.body ?? 'Bản nâng cấp phần mềm kế toán tự động.';
        if (this.webUpdate()) return this.webUpdate()!.notes;
        return '';
    });
    readonly isBackingUp = computed(() => this.state() === 'backing_up');
    readonly isDownloading = computed(() => this.state() === 'downloading');
    readonly isReady = computed(() => this.state() === 'ready');

    async checkUpdate(): Promise<void> {
        this.state.set('checking');
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

        let activeVersion = CURRENT_CLIENT_VERSION;
        if (isTauri) {
            try {
                const { getVersion } = await import('@tauri-apps/api/app');
                activeVersion = await getVersion();
            } catch {
                activeVersion = CURRENT_CLIENT_VERSION;
            }

            try {
                const update = await check();
                if (update?.available) {
                    this.tauriUpdate.set(update);
                    this.state.set('available');
                    return;
                }
            } catch {
                // Tauri native updater endpoint unreachable, fallback smoothly to Web API check
            }
        }

        // Web API Version Check
        try {
            this.http.get<any>(`${this.apiUrl}/accounting/version`).subscribe({
                next: (res) => {
                    if (res?.success && res.data?.version) {
                        const srvVer = res.data.version;
                        const dismissed = typeof localStorage !== 'undefined' ? localStorage.getItem('DISMISSED_UPDATE_VERSION') : null;
                        if (dismissed === srvVer) {
                            this.state.set('idle');
                            return;
                        }
                        if (this.isNewerVersion(srvVer, activeVersion)) {
                            this.webUpdate.set(res.data);
                            this.state.set('available');
                            return;
                        }
                    }
                    this.state.set('idle');
                },
                error: () => {
                    this.state.set('idle');
                }
            });
        } catch {
            this.state.set('idle');
        }
    }

    /**
     * Quy trình Cập nhật:
     * 1. Sao lưu toàn bộ dữ liệu người dùng hiện tại (Local Storage + Server Snapshot).
     * 2. Tải và cài đặt bản cập nhật.
     * 3. Relaunch (Desktop) hoặc Reload (Web) và tự động khôi phục dữ liệu đã lưu.
     */
    async downloadAndInstallWithBackup(getUserStateFn?: () => any): Promise<void> {
        this.state.set('backing_up');
        this.statusStepText.set('Đang sao lưu an toàn dữ liệu làm việc của bạn...');

        // 1. Sao lưu dữ liệu người dùng vào LocalStorage
        try {
            const userState = getUserStateFn ? getUserStateFn() : {};
            const backupPayload = {
                timestamp: new Date().toISOString(),
                fromVersion: CURRENT_CLIENT_VERSION,
                toVersion: this.updateVersion(),
                userState: userState,
                cachedAt: Date.now()
            };
            localStorage.setItem(PRE_UPDATE_BACKUP_KEY, JSON.stringify(backupPayload));
            console.log('Saved user state backup:', backupPayload);
        } catch (e) {
            console.error('Local backup failed', e);
        }

        // 2. Kích hoạt backup trên Server nếu có
        try {
            await this.http.post(`${this.apiUrl}/accounting/backup-before-update`, {}).toPromise();
        } catch {
            // Không chặn update nếu offline
        }

        this.statusStepText.set('Sao lưu hoàn tất! Đang chuẩn bị tải bản cập nhật...');

        // 3. Thực hiện cài đặt
        const tauriUp = this.tauriUpdate();
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

        if (tauriUp) {
            this.state.set('downloading');
            this.progress.set(0);
            let downloaded = 0;
            let total = 0;

            try {
                await tauriUp.downloadAndInstall((event) => {
                    switch (event.event) {
                        case 'Started':
                            total = event.data.contentLength ?? 0;
                            break;
                        case 'Progress':
                            downloaded += event.data.chunkLength;
                            this.progress.set(total > 0 ? Math.round((downloaded / total) * 100) : 0);
                            break;
                        case 'Finished':
                            this.progress.set(100);
                            this.state.set('ready');
                            this.statusStepText.set('Đã tải xong! Bấm Khởi động lại để hoàn tất.');
                            break;
                    }
                });
            } catch (err: any) {
                this.errorMsg.set(err?.message ?? 'Tải xuống thất bại');
                this.state.set('error');
            }
        } else if (isTauri) {
            // Desktop fallback: Tải trực tiếp file cài đặt chuẩn TroLyKeToan_Setup.exe
            this.state.set('downloading');
            this.progress.set(50);
            const downloadUrl = `${environment.domainApi || 'http://localhost:9093'}/assets/downloads/TroLyKeToan_Setup.exe`;

            try {
                const { openUrl } = await import('@tauri-apps/plugin-opener');
                await openUrl(downloadUrl);
            } catch {
                window.open(downloadUrl, '_blank');
            }

            // Ghi nhớ phiên bản đã tải để không thông báo lặp lại
            const ver = this.updateVersion();
            if (ver && typeof localStorage !== 'undefined') {
                try { localStorage.setItem('DISMISSED_UPDATE_VERSION', ver); } catch {}
            }

            this.progress.set(100);
            this.state.set('ready');
            this.statusStepText.set('Đã mở tải bộ cài đặt mới (TroLyKeToan_Setup.exe)! Vui lòng đóng phần mềm và chạy tệp vừa tải để hoàn tất nâng cấp.');
        } else {
            // Web update: reload trang bỏ qua cache
            this.state.set('downloading');
            this.progress.set(50);

            const ver = this.updateVersion();
            if (ver && typeof localStorage !== 'undefined') {
                try { localStorage.setItem('DISMISSED_UPDATE_VERSION', ver); } catch {}
            }

            setTimeout(() => {
                this.progress.set(100);
                this.state.set('ready');
                this.statusStepText.set('Bản cập nhật đã sẵn sàng! Bấm Hoàn tất để làm mới trang.');
            }, 600);
        }
    }

    async applyAndRelaunch(): Promise<void> {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
        const ver = this.updateVersion();
        if (ver && typeof localStorage !== 'undefined') {
            try { localStorage.setItem('DISMISSED_UPDATE_VERSION', ver); } catch {}
        }

        if (isTauri && this.tauriUpdate()) {
            await relaunch();
        } else if (isTauri) {
            // Desktop fallback: đóng banner sau khi đã mở tải bộ cài đặt
            this.dismiss();
        } else {
            // Web browser refresh
            window.location.reload();
        }
    }

    dismiss(): void {
        const ver = this.updateVersion();
        if (ver && typeof localStorage !== 'undefined') {
            try { localStorage.setItem('DISMISSED_UPDATE_VERSION', ver); } catch {}
        }
        this.tauriUpdate.set(null);
        this.webUpdate.set(null);
        this.state.set('idle');
    }

    /**
     * Khôi phục dữ liệu đã lưu sau khi cập nhật
     */
    restoreBackupAfterUpdate(): any | null {
        try {
            const raw = localStorage.getItem(PRE_UPDATE_BACKUP_KEY);
            if (!raw) return null;

            const backup = JSON.parse(raw);
            // Xóa khóa sau khi đọc thành công
            localStorage.removeItem(PRE_UPDATE_BACKUP_KEY);
            return backup.userState;
        } catch {
            return null;
        }
    }

    private isNewerVersion(remote: string, current: string): boolean {
        const rParts = remote.split('.').map(n => parseInt(n, 10) || 0);
        const cParts = current.split('.').map(n => parseInt(n, 10) || 0);

        for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
            const r = rParts[i] || 0;
            const c = cParts[i] || 0;
            if (r > c) return true;
            if (r < c) return false;
        }
        return false;
    }
}
