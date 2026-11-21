import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";
import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorBell,
  phosphorBriefcase,
  phosphorCamera,
  phosphorPhone,
  phosphorUser,
  phosphorUserPlus,
} from "@ng-icons/phosphor-icons/regular";
import { catchError, finalize, switchMap, throwError } from "rxjs";
import { MAX_AVATAR_SIZE_BYTES } from "../../../../core/constants";
import { NotificationService } from "../../../../core/services/notification.service";
import { ModalComponent } from "../../../../shared/ui/modal";
import { formatInitials, trimAssetUrl } from "../../../../shared/utils/display.util";
import { AuthUser } from "../../models/auth-user.model";
import { UserProfile } from "../../models/user-profile.model";
import { AuthService } from "../../services/auth.service";
import { UserAvatarService } from "../../services/user-avatar.service";

@Component({
  selector: "app-profile-modal",
  standalone: true,
  imports: [CommonModule, NgIcon, ModalComponent],
  templateUrl: "./profile-modal.component.html",
  styleUrl: "./profile-modal.component.scss",
})
export class ProfileModalComponent implements OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly userAvatarService = inject(UserAvatarService);
  private readonly authService = inject(AuthService);

  readonly open = input(false);
  readonly profile = input<UserProfile | null>(null);
  readonly closed = output<void>();
  readonly addAccountRequested = output<void>();
  readonly avatarUploaded = output<AuthUser | null>();

  private readonly avatarFileInput = viewChild<ElementRef<HTMLInputElement>>("avatarFileInput");
  private avatarPreviewObjectUrl = "";

  protected readonly nameIcon = phosphorUser;
  protected readonly jobIcon = phosphorBriefcase;
  protected readonly phoneIcon = phosphorPhone;
  protected readonly notificationIcon = phosphorBell;
  protected readonly addAccountIcon = phosphorUserPlus;
  protected readonly cameraIcon = phosphorCamera;
  protected readonly isUploadingAvatar = signal(false);
  protected readonly avatarUploadError = signal("");
  protected readonly selectedAvatarPreview = signal("");

  protected readonly isSelfProfile = computed(() => this.profile()?.isSelf ?? false);

  protected readonly modalTitle = computed(() =>
    this.isSelfProfile() ? "My Profile" : "Thông tin liên hệ"
  );

  protected readonly modalSubtitle = computed(() =>
    this.isSelfProfile()
      ? "Thông tin tài khoản của bạn"
      : "Xem thông tin người dùng"
  );

  protected readonly displayName = computed(() => {
    const profile = this.profile();
    return profile?.fullName?.trim() || profile?.username?.trim() || "—";
  });

  protected readonly username = computed(() => {
    return this.profile()?.username?.trim() || "—";
  });

  protected readonly jobPosition = computed(() => {
    return this.profile()?.jobPosition?.trim() || "—";
  });

  protected readonly phoneNumber = computed(() => {
    return this.profile()?.phoneNumber?.trim() || "—";
  });

  protected readonly avatarUrl = computed(() => {
    return this.selectedAvatarPreview() || trimAssetUrl(this.profile()?.avatarUrl);
  });

  protected readonly initials = computed(() => formatInitials(this.displayName()));

  protected readonly notificationsEnabled = this.notificationService.notificationsEnabled;

  protected close(): void {
    this.closed.emit();
  }

  ngOnDestroy(): void {
    this.revokeAvatarPreview();
  }

  protected openAvatarPicker(): void {
    if (!this.isSelfProfile() || this.isUploadingAvatar()) {
      return;
    }

    this.avatarUploadError.set("");
    this.avatarFileInput()?.nativeElement.click();
  }

  protected handleAvatarSelected(event: Event): void {
    const inputElement = event.target;

    if (!(inputElement instanceof HTMLInputElement)) {
      return;
    }

    const file = inputElement.files?.[0];
    inputElement.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      this.avatarUploadError.set("Vui long chon file anh hop le.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      this.avatarUploadError.set("Anh dai dien toi da 5MB.");
      return;
    }

    this.setAvatarPreview(file);
    this.isUploadingAvatar.set(true);
    this.avatarUploadError.set("");

    this.userAvatarService
      .uploadAvatar(file)
      .pipe(
        switchMap(() => this.authService.refreshToken()),
        catchError((error) => {
          this.avatarUploadError.set(this.resolveUploadError(error));
          this.clearAvatarPreview();
          return throwError(() => error);
        }),
        finalize(() => {
          this.isUploadingAvatar.set(false);
          this.clearAvatarPreview();
        })
      )
      .subscribe({
        next: () => this.avatarUploaded.emit(this.authService.currentUser()),
        error: () => undefined,
      });
  }

  protected setNotificationsEnabled(enabled: boolean): void {
    this.notificationService.setNotificationsEnabled(enabled);
  }

  protected requestAddAccount(): void {
    this.addAccountRequested.emit();
  }

  private setAvatarPreview(file: File): void {
    this.revokeAvatarPreview();
    this.avatarPreviewObjectUrl = URL.createObjectURL(file);
    this.selectedAvatarPreview.set(this.avatarPreviewObjectUrl);
  }

  private clearAvatarPreview(): void {
    this.revokeAvatarPreview();
    this.selectedAvatarPreview.set("");
  }

  private revokeAvatarPreview(): void {
    if (!this.avatarPreviewObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.avatarPreviewObjectUrl);
    this.avatarPreviewObjectUrl = "";
  }

  private resolveUploadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (typeof error.error === "string" && error.error.trim()) {
        return error.error;
      }

      if (typeof error.error?.message === "string" && error.error.message.trim()) {
        return error.error.message;
      }
    }

    return "Khong the cap nhat avatar. Vui long thu lai.";
  }
}
