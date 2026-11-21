import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TrayService {
    private isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    /** Ẩn cửa sổ xuống tray */
    async hideToTray(): Promise<void> {
        if (!this.isTauri) return;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        await getCurrentWindow().hide();
    }

    /** Hiện cửa sổ từ tray */
    async show(): Promise<void> {
        if (!this.isTauri) return;
        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        await win.show();
        await win.unminimize();
        await win.setFocus();
    }
}