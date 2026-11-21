import { CommonModule } from "@angular/common";
import { Component, computed, inject, input, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorAddressBook,
  phosphorBookmarkSimple,
  phosphorMoon,
  phosphorSignOut,
  phosphorSun,
  phosphorUserCircle,
  phosphorUsersThree,
  phosphorX,
} from "@ng-icons/phosphor-icons/regular";
import { AuthUser } from "../../../../features/auth/models/auth-user.model";
import { ThemeService } from "../../../services/theme.service";
import { formatInitials, trimAssetUrl } from "../../../../shared/utils/display.util";
import { HasRoleDirective } from "../../../../shared/directives";
import { ApproveModalComponent } from "../approve-modal/approve-modal.component";

@Component({
  selector: "app-chat-menu-drawer",
  standalone: true,
  imports: [CommonModule, NgIcon, HasRoleDirective, ApproveModalComponent],
  templateUrl: "./chat-menu-drawer.component.html",
  styleUrl: "./chat-menu-drawer.component.scss",
})
export class ChatMenuDrawerComponent {
  private readonly themeService = inject(ThemeService);

  readonly user = input<AuthUser | null>(null);
  readonly open = input(false);

  readonly closed = output<void>();
  readonly logoutRequested = output<void>();
  readonly contactsRequested = output<void>();
  readonly profileRequested = output<void>();

  protected readonly closeIcon = phosphorX;
  protected readonly profileIcon = phosphorUserCircle;
  protected readonly contactIcon = phosphorAddressBook;
  protected readonly savedMessageIcon = phosphorBookmarkSimple;
  protected readonly logoutIcon = phosphorSignOut;
  protected readonly approveIcon = phosphorUsersThree;
  protected readonly moonIcon = phosphorMoon;
  protected readonly sunIcon = phosphorSun;
  protected readonly isDarkMode = this.themeService.isDarkMode;

  protected readonly isApproveOpen = signal(false);

  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.fullName?.trim() || user?.username?.trim() || "AMATECH";
  });

  protected readonly username = computed(() => {
    return this.user()?.username?.trim() || "amatech";
  });

  protected readonly avatarUrl = computed(() => {
    return trimAssetUrl(this.user()?.avatarUrl);
  });

  protected readonly initials = computed(() => formatInitials(this.displayName()));

  protected close(): void {
    this.closed.emit();
  }

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  protected logout(): void {
    this.closed.emit();
    this.logoutRequested.emit();
  }

  protected openContacts(): void {
    this.closed.emit();
    this.contactsRequested.emit();
  }

  protected openApprove(): void {
    this.closed.emit();
    this.isApproveOpen.set(true);
  }

  protected closeApprove(): void {
    this.isApproveOpen.set(false);
  }

  protected openProfile(): void {
    this.closed.emit();
    this.profileRequested.emit();
  }
}
