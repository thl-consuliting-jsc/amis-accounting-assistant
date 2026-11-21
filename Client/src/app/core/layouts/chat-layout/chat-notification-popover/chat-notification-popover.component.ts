import { CommonModule } from "@angular/common";
import { Component, computed, input, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import { phosphorCheckCircle, phosphorX } from "@ng-icons/phosphor-icons/regular";

type NotificationTab = "general" | "call-history" | "missed-calls" | "department";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: NotificationTab;
}

@Component({
  selector: "app-chat-notification-popover",
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: "./chat-notification-popover.component.html",
  styleUrl: "./chat-notification-popover.component.scss",
})
export class ChatNotificationPopoverComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly closeIcon = phosphorX;
  protected readonly checkIcon = phosphorCheckCircle;
  protected readonly tabs: { value: NotificationTab; label: string }[] = [
    { value: "general", label: "Thông báo chung" },
    { value: "call-history", label: "Lịch sử cuộc gọi" },
    { value: "missed-calls", label: "Cuộc gọi bị nhỡ" },
    { value: "department", label: "Thông báo phòng ban" },
  ];

  protected activeTab = signal<NotificationTab>("general");

  protected notifications = signal<NotificationItem[]>([
    {
      id: "1",
      title: "Cập nhật hệ thống",
      message: "Hệ thống sẽ bảo trì vào 22:00 hôm nay để nâng cấp tính năng.",
      time: "10 phút trước",
      read: false,
      type: "general",
    },
    {
      id: "2",
      title: "Thông báo nhân sự",
      message: "Chào mừng bạn Nguyễn Văn A gia nhập công ty.",
      time: "2 giờ trước",
      read: true,
      type: "general",
    },
    {
      id: "3",
      title: "Cuộc gọi đã hoàn tất",
      message: "Bạn đã kết thúc cuộc gọi với Trần Minh.",
      time: "1 giờ trước",
      read: true,
      type: "call-history",
    },
    {
      id: "4",
      title: "Cuộc gọi bị nhỡ",
      message: "Bạn có cuộc gọi nhỡ từ Nguyễn Văn A.",
      time: "35 phút trước",
      read: false,
      type: "missed-calls",
    },
    {
      id: "5",
      title: "Lịch họp phòng ban",
      message: "Đừng quên lịch họp daily lúc 9:00 sáng mai nhé.",
      time: "1 giờ trước",
      read: false,
      type: "department",
    },
    {
      id: "6",
      title: "Code Review",
      message: "Bạn có 2 PR cần review trong dự án AMT Chat.",
      time: "3 giờ trước",
      read: true,
      type: "department",
    },
  ]);

  protected filteredNotifications = computed(() => {
    return this.notifications().filter((notification) => notification.type === this.activeTab());
  });

  protected close(): void {
    this.closed.emit();
  }

  protected switchTab(tab: NotificationTab): void {
    this.activeTab.set(tab);
  }

  protected markAsRead(id: string): void {
    this.notifications.update((items) =>
      items.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
  }
}
