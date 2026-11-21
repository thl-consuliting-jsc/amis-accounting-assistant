import { CommonModule } from "@angular/common";
import { Component, computed, input, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorBell,
  phosphorGearSix,
  phosphorList,
  phosphorMagnifyingGlass,
  phosphorSignOut,
} from "@ng-icons/phosphor-icons/regular";
import { AuthUser } from "../../../../features/auth/models/auth-user.model";
import { ChatRoomListComponent } from "../../../../features/chat/components/chat-room-list";
import { MessageBoxComponent } from "../../../../shared/ui/message-box";
import { ConversationPreview } from "../../../../features/chat/models/conversation.model";
import { formatInitials, trimAssetUrl } from "../../../../shared/utils/display.util";
import { ChatMenuDrawerComponent } from "../chat-menu-drawer/chat-menu-drawer.component";
import { ChatNotificationPopoverComponent } from "../chat-notification-popover/chat-notification-popover.component";

@Component({
  selector: "app-chat-left-layout",
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    ChatMenuDrawerComponent,
    ChatRoomListComponent,
    MessageBoxComponent,
    ChatNotificationPopoverComponent,
  ],
  templateUrl: "./chat-left-layout.component.html",
  styleUrl: "./chat-left-layout.component.scss",
})
export class ChatLeftLayoutComponent {
  readonly user = input<AuthUser | null>(null);
  readonly conversations = input<ConversationPreview[]>([]);
  readonly activeConversation = input<ConversationPreview | null>(null);

  readonly conversationSelected = output<ConversationPreview>();
  readonly logoutRequested = output<void>();
  readonly contactsRequested = output<void>();
  readonly profileRequested = output<void>();

  protected readonly menuIcon = phosphorList;
  protected readonly searchIcon = phosphorMagnifyingGlass;
  protected readonly bellIcon = phosphorBell;
  protected readonly settingsIcon = phosphorGearSix;
  protected readonly logoutIcon = phosphorSignOut;

  protected readonly searchTerm = signal("");
  protected readonly isMenuOpen = signal(false);
  protected readonly isLogoutConfirmOpen = signal(false);
  protected readonly isNotificationOpen = signal(false);

  protected readonly displayName = computed(() => {
    const user = this.user();
    return user?.fullName?.trim() || user?.username?.trim() || "AMATECH";
  });

  protected readonly userSubtitle = computed(() => {
    return this.user()?.jobPosition?.trim() || "Đang hoạt động";
  });

  protected readonly avatarUrl = computed(() => {
    return trimAssetUrl(this.user()?.avatarUrl);
  });

  protected readonly initials = computed(() => formatInitials(this.displayName()));

  protected toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleNotification(): void {
    this.isNotificationOpen.update((value) => !value);
  }

  protected closeNotification(): void {
    this.isNotificationOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.isLogoutConfirmOpen.set(true);
  }

  protected confirmLogout(): void {
    this.isLogoutConfirmOpen.set(false);
    this.logoutRequested.emit();
  }

  protected cancelLogout(): void {
    this.isLogoutConfirmOpen.set(false);
  }

  protected openContacts(): void {
    this.closeMenu();
    this.contactsRequested.emit();
  }

  protected openProfile(): void {
    this.closeMenu();
    this.profileRequested.emit();
  }
}
