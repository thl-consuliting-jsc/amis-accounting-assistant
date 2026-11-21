import { DestroyRef, Injectable, computed, effect, inject, signal } from "@angular/core";
import { AuthService } from "../../auth/services/auth.service";
import {
  ChatEntityId,
  ConversationMessageSendRequest,
  ConversationPreview,
} from "../models/conversation.model";
import { DirectRoomOpenRequest } from "../models/direct-room.model";
import { ConversationFormatService } from "./conversation-format.service";
import { ChatSignalrService } from "./chat-signalr.service";

@Injectable()
export class ChatSessionService {
  private readonly authService = inject(AuthService);
  private readonly chatSignalrService = inject(ChatSignalrService);
  private readonly conversationFormat = inject(ConversationFormatService);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = computed(() => this.chatSignalrService.rooms());
  readonly activeConversation = signal<ConversationPreview | null>(null);
  readonly hasMore = computed(() => this.chatSignalrService.hasMore());
  readonly hasNewer = computed(() => this.chatSignalrService.hasNewer());
  readonly oldestMessageId = computed(() => this.chatSignalrService.oldestMessageId());
  readonly newestMessageId = computed(() => this.chatSignalrService.newestMessageId());
  readonly anchorMessageId = computed(() => this.chatSignalrService.anchorMessageId());

  private readonly pendingRoomId = signal<ChatEntityId | null>(null);
  private readonly isComposerFocused = signal(false);

  constructor() {
    void this.chatSignalrService.connect();

    effect(() => {
      const conversations = this.conversations();
      const activeConversation = this.activeConversation();
      const pendingRoomId = this.pendingRoomId();

      if (conversations.length === 0) {
        if (!pendingRoomId) {
          this.activeConversation.set(null);
        }
        return;
      }

      const pendingConversation = conversations.find((conversation) => conversation.id === pendingRoomId);

      if (pendingConversation) {
        this.pendingRoomId.set(null);
        this.activeConversation.set(pendingConversation);
        return;
      }

      const updatedActiveConversation = conversations.find(
        (conversation) => conversation.id === activeConversation?.id
      );
      const nextActiveConversation = updatedActiveConversation ?? null;

      if (activeConversation !== nextActiveConversation) {
        this.activeConversation.set(nextActiveConversation);
      }
    });

    effect(() => {
      const roomId = this.activeConversation()?.id;

      if (roomId) {
        void this.chatSignalrService.joinRoom(roomId);
      }
    });

    effect(() => {
      const conversation = this.activeConversation();

      if (this.isComposerFocused() && conversation && conversation.unread > 0) {
        void this.chatSignalrService.readRoom(conversation.id);
      }
    });

    this.destroyRef.onDestroy(() => {
      void this.chatSignalrService.disconnect();
    });
  }

  selectConversation(conversation: ConversationPreview): void {
    this.activeConversation.set(conversation);
  }

  openDirectRoom(request: DirectRoomOpenRequest): void {
    const conversation = this.conversations().find((item) => item.id === request.roomId);
    const draftConversation = conversation ?? this.createDirectConversation(request);

    this.pendingRoomId.set(request.roomId);
    this.chatSignalrService.upsertDraftRoom(draftConversation);
    this.activeConversation.set(draftConversation);

    if (conversation) {
      this.pendingRoomId.set(null);
    }

    void this.chatSignalrService.joinRoom(request.roomId);
  }

  sendMessage(event: ConversationMessageSendRequest): void {
    const roomId = this.activeConversation()?.id;

    if (!roomId) {
      return;
    }

    void this.chatSignalrService.sendMessage(
      roomId,
      event.content ?? null,
      event.replyToMessageId ?? null,
      event.stickerId ?? null
    );
  }

  /**
   * Load thêm tin nhắn cũ hơn (khi user scroll lên đầu danh sách).
   * @param beforeMessageId Id của tin nhắn cũ nhất hiện có trên client (cursor)
   */
  loadMoreMessages(beforeMessageId: ChatEntityId): void {
    const roomId = this.activeConversation()?.id;

    if (!roomId) {
      return;
    }

    void this.chatSignalrService.loadMoreMessages(roomId, beforeMessageId);
  }

  loadNewerMessages(afterMessageId: ChatEntityId): void {
    const roomId = this.activeConversation()?.id;

    if (!roomId) {
      return;
    }

    void this.chatSignalrService.loadNewerMessages(roomId, afterMessageId);
  }

  jumpToMessage(targetMessageId: ChatEntityId): void {
    const roomId = this.activeConversation()?.id;

    if (!roomId) {
      return;
    }

    void this.chatSignalrService.jumpToMessage(roomId, targetMessageId);
  }

  jumpToLatest(): void {
    const roomId = this.activeConversation()?.id;

    if (!roomId) {
      return;
    }

    void this.chatSignalrService.jumpToLatest(roomId);
  }

  clearAnchorMessageId(): void {
    this.chatSignalrService.clearAnchorMessageId();
  }

  setComposerFocused(isFocused: boolean): void {
    this.isComposerFocused.set(isFocused);
  }

  logout(): void {
    void this.chatSignalrService.disconnect();
    this.authService.logout();
  }

  private createDirectConversation(request: DirectRoomOpenRequest): ConversationPreview {
    return {
      id: request.roomId,
      type: "direct",
      name: request.contact.fullName || request.contact.username,
      username: request.contact.username,
      avatarUrl: request.contact.avatarUrl,
      message: this.conversationFormat.emptyRoomMessage,
      time: "",
      unread: 0,
      online: request.contact.online,
      messages: [],
    };
  }
}
