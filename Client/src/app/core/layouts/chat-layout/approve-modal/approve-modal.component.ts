import { CommonModule } from "@angular/common";
import { Component, computed, input, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorCheck,
  phosphorEnvelopeSimple,
  phosphorUserCircle,
  phosphorX,
} from "@ng-icons/phosphor-icons/regular";
import { ModalComponent } from "../../../../shared/ui/modal";
import { formatInitials } from "../../../../shared/utils/display.util";

export interface PendingUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  jobPosition: string;
  avatarUrl: string;
  registeredAt: string;
}

/** Trạng thái xử lý của từng user trong phiên hiện tại */
type ActionState = "idle" | "approving" | "approved" | "rejected";

@Component({
  selector: "app-approve-modal",
  standalone: true,
  imports: [CommonModule, NgIcon, ModalComponent],
  templateUrl: "./approve-modal.component.html",
  styleUrl: "./approve-modal.component.scss",
})
export class ApproveModalComponent {
  readonly open = input(false);
  readonly closed = output<void>();

  protected readonly userIcon = phosphorUserCircle;
  protected readonly emailIcon = phosphorEnvelopeSimple;
  protected readonly approveIcon = phosphorCheck;
  protected readonly rejectIcon = phosphorX;

  /** Trạng thái từng user theo id */
  protected actionState = signal<Record<string, ActionState>>({});

  /** Data mẫu — thay bằng API call thực tế sau */
  protected readonly pendingUsers = signal<PendingUser[]>([
    {
      id: "u-001",
      fullName: "Trần Văn An",
      username: "anTV",
      email: "antranvan@amatech.vn",
      jobPosition: "Nhân viên kinh doanh",
      avatarUrl: "",
      registeredAt: "2026-05-28T08:32:00Z",
    },
    {
      id: "u-002",
      fullName: "Nguyễn Thị Bích",
      username: "bichNT",
      email: "bich.nguyen@amatech.vn",
      jobPosition: "Kỹ sư phần mềm",
      avatarUrl: "",
      registeredAt: "2026-05-28T10:15:00Z",
    },
    {
      id: "u-003",
      fullName: "Lê Hoàng Phúc",
      username: "phucLH",
      email: "phuc.le@amatech.vn",
      jobPosition: "Nhân viên hành chính",
      avatarUrl: "",
      registeredAt: "2026-05-29T07:00:00Z",
    },
    {
      id: "u-004",
      fullName: "Phạm Minh Quân",
      username: "quanPM",
      email: "quan.pham@amatech.vn",
      jobPosition: "Chuyên viên marketing",
      avatarUrl: "",
      registeredAt: "2026-05-29T08:45:00Z",
    },
  ]);

  protected readonly pendingCount = computed(
    () => this.pendingUsers().filter((u) => this.getState(u.id) === "idle").length,
  );

  protected getState(id: string): ActionState {
    return this.actionState()[id] ?? "idle";
  }

  protected getInitials(name: string): string {
    return formatInitials(name);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  protected approve(id: string): void {
    this.actionState.update((s) => ({ ...s, [id]: "approving" }));

    // TODO: thay bằng API call thực tế
    setTimeout(() => {
      this.actionState.update((s) => ({ ...s, [id]: "approved" }));
    }, 800);
  }

  protected reject(id: string): void {
    this.actionState.update((s) => ({ ...s, [id]: "approving" }));

    // TODO: thay bằng API call thực tế
    setTimeout(() => {
      this.actionState.update((s) => ({ ...s, [id]: "rejected" }));
    }, 800);
  }

  protected close(): void {
    this.closed.emit();
  }
}
