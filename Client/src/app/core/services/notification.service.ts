import { Injectable, signal } from '@angular/core';
import { NOTIFICATIONS_ENABLED_KEY } from "../constants";

@Injectable({ providedIn: 'root' })
export class NotificationService {
    private isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
    private permissionGranted = false;
    private audioContext: AudioContext | null = null;
    private readonly _notificationsEnabled = signal(this.readNotificationsEnabled());

    readonly notificationsEnabled = this._notificationsEnabled.asReadonly();

    async init(): Promise<void> {
        if (!this.isTauri) return;
        const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
        this.permissionGranted = await isPermissionGranted();
        if (!this.permissionGranted) {
            const permission = await requestPermission();
            this.permissionGranted = permission === 'granted';
        }
    }

    setNotificationsEnabled(enabled: boolean): void {
        this._notificationsEnabled.set(enabled);

        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? '1' : '0');
        }
    }

    async notify(title: string, body: string): Promise<void> {
        if (!this._notificationsEnabled() || !this.isTauri || !this.permissionGranted) return;

        const { getCurrentWindow } = await import('@tauri-apps/api/window');
        const win = getCurrentWindow();
        const [isVisible, isFocused] = await Promise.all([win.isVisible(), win.isFocused()]);
        if (isVisible && isFocused) return;

        // Bắn notification và play sound đồng thời
        const { sendNotification } = await import('@tauri-apps/plugin-notification');
        sendNotification({ title, body });
        this.playNotificationSound();
    }

    /**
     * Tạo âm thanh "ding" bằng Web Audio API — không cần file âm thanh.
     * Gồm 2 nốt: nốt cao → nốt thấp, giống notification chat phổ biến.
     */
    private playNotificationSound(): void {
        try {
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            const ctx = this.audioContext;
            const now = ctx.currentTime;

            // Nốt 1: 880Hz (A5) - 0.12s
            this.playTone(ctx, 880, now, 0.12);
            // Nốt 2: 660Hz (E5) - bắt đầu sau 0.1s, kéo dài 0.2s
            this.playTone(ctx, 660, now + 0.1, 0.2);
        } catch {
            // Web Audio API không khả dụng — bỏ qua
        }
    }

    private readNotificationsEnabled(): boolean {
        if (typeof localStorage === 'undefined') {
            return true;
        }

        const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
        return stored !== '0';
    }

    private playTone(ctx: AudioContext, frequency: number, startTime: number, duration: number): void {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Fade in nhanh → fade out mượt để tránh tiếng "click"
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }
}
