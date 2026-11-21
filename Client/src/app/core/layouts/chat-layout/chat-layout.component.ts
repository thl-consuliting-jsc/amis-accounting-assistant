import { Component, inject, input, signal } from "@angular/core";
import { AuthUser } from "../../../features/auth/models/auth-user.model";
import { ChatLeftLayoutComponent } from "./chat-left-layout/chat-left-layout.component";
import { ChatRightLayoutComponent } from "./chat-right-layout/chat-right-layout.component";
import {
  ChatEntityId,
  ConversationMessageSendRequest,
  ConversationPreview,
} from "../../../features/chat/models/conversation.model";
import { DirectRoomOpenRequest } from "../../../features/chat/models/direct-room.model";
import { ProfileModalComponent } from "../../../features/auth/components/profile-modal";
import { UserProfile } from "../../../features/auth/models/user-profile.model";
import { ProfileOpenRequest } from "../../../features/chat/models/profile-open-request.model";
import { ContactListModalComponent } from "../../../features/contact/components/contact-list-modal";
import { DirectRoomReadyEvent } from "../../../features/contact/models/direct-room-ready.model";
import { ChatSessionService } from "../../../features/chat/services/chat-session.service";
import { UserProfileService } from "../../../features/user/services/user-profile.service";

@Component({
  selector: "app-chat-page",
  standalone: true,
  imports: [
    ChatLeftLayoutComponent,
    ChatRightLayoutComponent,
    ContactListModalComponent,
    ProfileModalComponent,
  ],
  providers: [ChatSessionService],
  templateUrl: "./chat-layout.component.html",
  styleUrl: "./chat-layout.component.scss",
})
export class ChatLayoutComponent {
  readonly user = input<AuthUser | null>(null);

  private readonly chatSession = inject(ChatSessionService);
  private readonly userProfileService = inject(UserProfileService);

  protected readonly conversations = this.chatSession.conversations;
  protected readonly activeConversation = this.chatSession.activeConversation;
  protected readonly hasMore = this.chatSession.hasMore;
  protected readonly hasNewer = this.chatSession.hasNewer;
  protected readonly oldestMessageId = this.chatSession.oldestMessageId;
  protected readonly newestMessageId = this.chatSession.newestMessageId;
  protected readonly anchorMessageId = this.chatSession.anchorMessageId;
  protected readonly isContactModalOpen = signal(false);
  protected readonly isProfileModalOpen = signal(false);
  protected readonly selectedProfile = signal<UserProfile | null>(null);
  protected readonly isMobileConversationOpen = signal(false);

  protected selectConversation(conversation: ConversationPreview): void {
    this.chatSession.selectConversation(conversation);
    this.isMobileConversationOpen.set(true);
  }

  protected closeMobileConversation(): void {
    this.isMobileConversationOpen.set(false);
    this.chatSession.setComposerFocused(false);
  }

  protected logout(): void {
    this.chatSession.logout();
  }

  protected openContactModal(): void {
    this.isContactModalOpen.set(true);
  }

  protected closeContactModal(): void {
    this.isContactModalOpen.set(false);
  }

  protected openProfileModal(): void {
    const user = this.user();

    if (!user) {
      return;
    }

    this.loadMyProfile();
  }

  protected openChatProfile(request: ProfileOpenRequest): void {
    if (request.scope === "conversation" && request.conversation.type === "group") {
      return;
    }

    const username = this.resolveProfileUsername(request);

    if (!username) {
      return;
    }

    if (this.isCurrentUser(username)) {
      this.loadMyProfile();
      return;
    }

    this.selectedProfile.set(null);
    this.isProfileModalOpen.set(true);
    this.userProfileService.getUserProfile(username).subscribe({
      next: (profile) => this.selectedProfile.set(profile),
      error: () => this.isProfileModalOpen.set(false),
    });
  }

  protected closeProfileModal(): void {
    this.isProfileModalOpen.set(false);
    this.selectedProfile.set(null);
  }

  protected refreshSelectedProfile(updatedUser: AuthUser | null): void {
    const profile = this.selectedProfile();

    if (!profile?.isSelf) {
      return;
    }

    this.loadMyProfile();
  }

  private loadMyProfile(): void {
    this.selectedProfile.set(null);
    this.isProfileModalOpen.set(true);
    this.userProfileService.getMyProfile().subscribe({
      next: (profile) => this.selectedProfile.set(profile),
      error: () => this.isProfileModalOpen.set(false),
    });
  }

  private resolveProfileUsername(request: ProfileOpenRequest): string {
    const username =
      request.scope === "message"
        ? request.message.senderUsername
        : request.conversation.username;

    return username?.trim().replace(/^@/, "") ?? "";
  }

  private isCurrentUser(username: string): boolean {
    return this.user()?.username.localeCompare(username, undefined, { sensitivity: "accent" }) === 0;
  }

  protected openDirectRoom(event: DirectRoomReadyEvent): void {
    const request: DirectRoomOpenRequest = {
      roomId: event.roomId,
      contact: event.contact,
    };
    this.chatSession.openDirectRoom(request);
    this.isMobileConversationOpen.set(true);
  }

  protected sendMessage(event: ConversationMessageSendRequest): void {
    this.chatSession.sendMessage(event);
  }

  protected handleComposerFocus(): void {
    this.chatSession.setComposerFocused(true);
  }

  protected handleComposerBlur(): void {
    this.chatSession.setComposerFocused(false);
  }

  protected handleLoadMoreMessages(): void {
    const beforeMessageId = this.oldestMessageId();

    if (beforeMessageId === null) {
      return;
    }

    this.chatSession.loadMoreMessages(beforeMessageId);
  }

  protected handleLoadNewerMessages(): void {
    const afterMessageId = this.newestMessageId();

    if (afterMessageId === null) {
      return;
    }

    this.chatSession.loadNewerMessages(afterMessageId);
  }

  protected handleJumpToMessage(targetMessageId: ChatEntityId): void {
    this.chatSession.jumpToMessage(targetMessageId);
  }

  protected handleJumpToLatest(): void {
    this.chatSession.jumpToLatest();
  }

  protected handleAnchorConsumed(): void {
    this.chatSession.clearAnchorMessageId();
  }
}
