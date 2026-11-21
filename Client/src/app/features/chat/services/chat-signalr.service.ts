import { Injectable, NgZone, computed, inject, signal } from "@angular/core";
import * as signalR from "@microsoft/signalr";
import { firstValueFrom } from "rxjs";
import { environment } from "../../../../environments/environment";
import {
  API_ASSET_BASE_URL,
  DIRECT_ROOM_READY_TIMEOUT_MS,
  SIGNALR_RECONNECT_DELAYS_MS,
} from "../../../core/constants";
import { AssetUrlService } from "../../../core/services/asset-url.service";
import { TokenService } from "../../../core/services/token.service";
import { NotificationService } from "../../../core/services/notification.service";
import { formatMessagePreview } from "../../../shared/utils/display.util";
import { AuthService } from "../../auth/services/auth.service";
import { ChatMessageDto } from "../models/chat-message.dto";
import { ChatEntityId, ConversationPreview } from "../models/conversation.model";
import { DirectRoomReadyPayload } from "../models/direct-room.model";
import { HubConnectionStatus } from "../models/hub-connection.model";
import { RoomSummaryDto } from "../models/room-summary.model";
import { ConversationFormatService } from "./conversation-format.service";
import { MessagePageDto } from "../models/message-page.model";

@Injectable({
  providedIn: "root",
})
export class ChatSignalrService {
  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly ngZone = inject(NgZone);
  private readonly notificationService = inject(NotificationService);
  private readonly conversationFormat = inject(ConversationFormatService);
  private readonly assetUrlService = inject(AssetUrlService);
  private readonly assetBaseUrl = environment.domainApi;

  private hubConnection: signalR.HubConnection | null = null;
  private joinedRoomId: ChatEntityId | null = null;
  private readonly messagesByRoomId = new Map<ChatEntityId, ConversationPreview["messages"]>();
  private readonly draftRooms = new Map<ChatEntityId, ConversationPreview>();
  private readonly _rooms = signal<ConversationPreview[]>([]);
  private readonly _status = signal<HubConnectionStatus>("disconnected");
  private readonly _hasMore = signal<boolean>(false);
  private readonly _hasNewer = signal<boolean>(false);
  private readonly _oldestMessageId = signal<ChatEntityId | null>(null);
  private readonly _newestMessageId = signal<ChatEntityId | null>(null);
  private readonly _anchorMessageId = signal<ChatEntityId | null>(null);

  readonly rooms = computed(() => this._rooms());
  readonly status = computed(() => this._status());
  readonly hasMore = computed(() => this._hasMore());
  readonly hasNewer = computed(() => this._hasNewer());
  readonly oldestMessageId = computed(() => this._oldestMessageId());
  readonly newestMessageId = computed(() => this._newestMessageId());
  readonly anchorMessageId = computed(() => this._anchorMessageId());

  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.hubConnection?.state === signalR.HubConnectionState.Connecting) {
      return;
    }

    const accessToken = this.tokenService.getAccessToken();

    if (!accessToken || this.tokenService.isAccessTokenExpired()) {
      this._status.set("disconnected");
      this._rooms.set([]);
      return;
    }

    this.hubConnection = this.createConnection();
    this.registerHandlers(this.hubConnection);

    try {
      this._status.set("connecting");
      await this.hubConnection.start();
      this._status.set("connected");
      await this.notificationService.init(); // <-- THÊM: xin quyền sau khi connect thành công
    } catch (error) {
      this._status.set("disconnected");
      this._rooms.set([]);
      console.error("SignalR chat connection failed", error);
    }
  }

  async disconnect(): Promise<void> {
    const connection = this.hubConnection;

    if (!connection) {
      return;
    }

    this.hubConnection = null;
    connection.off("UpdateRoomList");
    connection.off("DirectRoomReady");
    connection.off("LoadMessages");
    connection.off("PrependMessages");
    connection.off("AppendMessages");
    connection.off("LoadMessageContext");
    connection.off("ReceiveMessage");
    await connection.stop();
    this.joinedRoomId = null;
    this.messagesByRoomId.clear();
    this.draftRooms.clear();
    this._status.set("disconnected");
    this._rooms.set([]);
  }

  async getOrCreateDirectRoom(otherUserId: ChatEntityId): Promise<ChatEntityId> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("SignalR chat connection is not ready");
    }

    return new Promise<ChatEntityId>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        connection.off("DirectRoomReady", handleDirectRoomReady);
        reject(new Error("Timed out waiting for DirectRoomReady"));
      }, DIRECT_ROOM_READY_TIMEOUT_MS);

      const handleDirectRoomReady = (payload: DirectRoomReadyPayload) => {
        const roomId = payload.roomId ?? payload.RoomId;

        if (!roomId) {
          return;
        }

        window.clearTimeout(timeoutId);
        connection.off("DirectRoomReady", handleDirectRoomReady);
        resolve(roomId);
      };

      connection.on("DirectRoomReady", handleDirectRoomReady);

      connection.invoke("GetOrCreateDirectRoom", otherUserId).catch((error) => {
        window.clearTimeout(timeoutId);
        connection.off("DirectRoomReady", handleDirectRoomReady);
        reject(error);
      });
    });
  }

  upsertDraftRoom(conversation: ConversationPreview): void {
    this.draftRooms.set(conversation.id, conversation);
    this._rooms.update((rooms) => this.mergeRoomsWithDrafts(rooms));
  }

  async joinRoom(roomId: ChatEntityId): Promise<void> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.joinedRoomId === roomId) {
      return;
    }

    if (this.joinedRoomId !== null) {
      await this.leaveRoom(this.joinedRoomId);
    }

    this.joinedRoomId = roomId;
    await connection.invoke("JoinRoom", roomId);
  }

  async leaveRoom(roomId: ChatEntityId): Promise<void> {
    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    await connection.invoke("LeaveRoom", roomId);

    if (this.joinedRoomId === roomId) {
      this.joinedRoomId = null;
    }
  }

  async sendMessage(
      roomId: ChatEntityId,
      content: string | null = null,
      replyToMessageId: ChatEntityId | null = null,
      stickerId: number | null = null
  ): Promise<void> {
    const trimmedContent = content?.trim() ?? "";

    if (!trimmedContent && stickerId === null) {
      return;
    }

    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("SignalR chat connection is not ready");
    }

    if (this.joinedRoomId !== roomId) {
      await this.joinRoom(roomId);
    }

    await connection.invoke(
        "SendMessage",
        roomId,
        trimmedContent || null,
        replyToMessageId,
        stickerId
    );
  }

  async readRoom(roomId: ChatEntityId): Promise<void> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    await connection.invoke("ReadRoom", roomId);
  }

  /**
   * Load thêm tin nhắn cũ hơn (khi user scroll lên đầu danh sách).
   * Server sẽ trả về event "PrependMessages".
   */
  async loadMoreMessages(roomId: ChatEntityId, beforeMessageId: ChatEntityId): Promise<void> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("SignalR chat connection is not ready");
    }

    if (this.joinedRoomId !== roomId) {
      throw new Error("Must join room before loading more messages");
    }

    await connection.invoke("LoadMoreMessages", roomId, beforeMessageId);
  }

  /**
   * Load thêm tin nhắn mới hơn trong Context Mode (khi user scroll xuống đáy).
   * Server sẽ trả về event "AppendMessages".
   */
  async loadNewerMessages(roomId: ChatEntityId, afterMessageId: ChatEntityId): Promise<void> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("SignalR chat connection is not ready");
    }

    if (this.joinedRoomId !== roomId) {
      throw new Error("Must join room before loading newer messages");
    }

    await connection.invoke("LoadNewerMessages", roomId, afterMessageId);
  }

  /**
   * Nhảy đến một tin nhắn cụ thể (khi user click reply preview).
   * Server sẽ trả về event "LoadMessageContext".
   */
  async jumpToMessage(roomId: ChatEntityId, targetMessageId: ChatEntityId): Promise<void> {
    await this.connect();

    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("SignalR chat connection is not ready");
    }

    if (this.joinedRoomId !== roomId) {
      throw new Error("Must join room before jumping to message");
    }

    await connection.invoke("JumpToMessage", roomId, targetMessageId);
  }

  /**
   * Quay về Live Mode: gọi lại JoinRoom để reload 50 tin nhắn mới nhất.
   */
  async jumpToLatest(roomId: ChatEntityId): Promise<void> {
    const connection = this.hubConnection;

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    await connection.invoke("JoinRoom", roomId);
  }

  clearAnchorMessageId(): void {
    this._anchorMessageId.set(null);
  }

  private createConnection(): signalR.HubConnection {
    return new signalR.HubConnectionBuilder()
        .withUrl(environment.signalrHubUrl, {
          // accessTokenFactory được gọi mỗi lần SignalR cần token (connect + mỗi lần reconnect).
          // Nếu token hết hạn → tự refresh trước khi trả về, đảm bảo connection không bị 401.
          accessTokenFactory: () => this.getValidAccessToken(),
        })
        .withAutomaticReconnect({
          // Retry sau: 0s, 2s, 5s, 10s, 30s rồi dừng
          nextRetryDelayInMilliseconds: (context) => {
            return SIGNALR_RECONNECT_DELAYS_MS[context.previousRetryCount] ?? null;
          },
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();
  }

  /**
   * Trả về access token hợp lệ.
   * Nếu token sắp hết hạn hoặc đã hết hạn → gọi refresh trước.
   */
  private async getValidAccessToken(): Promise<string> {
    console.log('Token expired?', this.tokenService.isAccessTokenExpired());

    if (this.tokenService.isAccessTokenExpired()) {
      try {
        await firstValueFrom(this.authService.refreshToken());
      } catch {
        this.disconnect();
        return "";
      }
    }

    const token = this.tokenService.getAccessToken() ?? "";
    console.log('Token exists?', !!token);
    return token;
  }
  private registerHandlers(connection: signalR.HubConnection): void {
    connection.on("UpdateRoomList", (rooms: RoomSummaryDto[]) => {
      this.ngZone.run(() => {
        const currentRooms = this._rooms();
        const mappedRooms = (rooms ?? []).map((room) => {
          const mappedRoom = this.mapRoomSummary(room);
          const currentRoom = currentRooms.find((item) => item.id === mappedRoom.id);

          this.draftRooms.delete(mappedRoom.id);

          return {
            ...mappedRoom,
            messages: this.messagesByRoomId.get(mappedRoom.id) ?? currentRoom?.messages ?? [],
          };
        });

        this._rooms.set(this.mergeRoomsWithDrafts(mappedRooms));
      });
    });

    connection.on("LoadMessages", (payload: MessagePageDto | ChatMessageDto[] | { data?: ChatMessageDto[]; Data?: ChatMessageDto[] }) => {
      this.ngZone.run(() => {
        const roomId = this.joinedRoomId;
        if (roomId === null) return;

        // Xử lý cả 2 format: MessagePageDto mới và array cũ
        let messages: ChatMessageDto[];
        let hasMore = false;
        let hasNewer = false;
        let oldestMessageId: ChatEntityId | null = null;
        let newestMessageId: ChatEntityId | null = null;

        if (Array.isArray(payload)) {
          // Format cũ: array trực tiếp
          messages = payload;
        } else if ("messages" in payload || "Messages" in payload) {
          // Format mới: MessagePageDto
          messages = (payload as MessagePageDto).messages ?? (payload as MessagePageDto).Messages ?? [];
          hasMore = (payload as MessagePageDto).hasMore ?? (payload as MessagePageDto).HasMore ?? false;
          hasNewer = (payload as MessagePageDto).hasNewer ?? (payload as MessagePageDto).HasNewer ?? false;
          oldestMessageId = (payload as MessagePageDto).oldestMessageId ?? (payload as MessagePageDto).OldestMessageId ?? null;
          newestMessageId = (payload as MessagePageDto).newestMessageId ?? (payload as MessagePageDto).NewestMessageId ?? null;
        } else {
          // Format cũ khác: { data: [...] } hoặc { Data: [...] }
          messages = (payload as { data?: ChatMessageDto[]; Data?: ChatMessageDto[] }).data
            ?? (payload as { data?: ChatMessageDto[]; Data?: ChatMessageDto[] }).Data
            ?? [];
        }

        this._hasMore.set(hasMore);
        this._hasNewer.set(hasNewer);
        this._oldestMessageId.set(oldestMessageId);
        this._newestMessageId.set(newestMessageId);
        this._anchorMessageId.set(null);
        this.updateRoomMessages(roomId, messages.map((message) => this.mapMessage(message)));
      });
    });

    // Handler cho load more (prepend messages cũ hơn)
    connection.on("PrependMessages", (payload: MessagePageDto) => {
      this.ngZone.run(() => {
        const roomId = this.joinedRoomId;
        if (roomId === null) return;

        const messages: ChatMessageDto[] = payload.messages ?? payload.Messages ?? [];
        const hasMore = payload.hasMore ?? payload.HasMore ?? false;
        const oldestMessageId = payload.oldestMessageId ?? payload.OldestMessageId ?? null;

        this._hasMore.set(hasMore);
        this._oldestMessageId.set(oldestMessageId);
        this.prependRoomMessages(roomId, messages.map((message) => this.mapMessage(message)));
      });
    });

    // Handler cho scroll xuống trong Context Mode (append messages mới hơn)
    connection.on("AppendMessages", (payload: MessagePageDto) => {
      this.ngZone.run(() => {
        const roomId = this.joinedRoomId;
        if (roomId === null) return;

        const messages: ChatMessageDto[] = payload.messages ?? payload.Messages ?? [];
        const hasNewer = payload.hasNewer ?? payload.HasNewer ?? false;
        const newestMessageId = payload.newestMessageId ?? payload.NewestMessageId ?? null;

        this._hasNewer.set(hasNewer);
        this._newestMessageId.set(newestMessageId);
        this.appendRoomMessages(roomId, messages.map((message) => this.mapMessage(message)));
      });
    });

    // Handler cho jump to message — REPLACE toàn bộ list, scroll đến anchor
    connection.on("LoadMessageContext", (payload: MessagePageDto) => {
      this.ngZone.run(() => {
        const roomId = this.joinedRoomId;
        if (roomId === null) return;

        const messages: ChatMessageDto[] = payload.messages ?? payload.Messages ?? [];
        const hasMore = payload.hasMore ?? payload.HasMore ?? false;
        const hasNewer = payload.hasNewer ?? payload.HasNewer ?? false;
        const oldestMessageId = payload.oldestMessageId ?? payload.OldestMessageId ?? null;
        const newestMessageId = payload.newestMessageId ?? payload.NewestMessageId ?? null;
        const anchorMessageId = payload.anchorMessageId ?? payload.AnchorMessageId ?? null;

        this._hasMore.set(hasMore);
        this._hasNewer.set(hasNewer);
        this._oldestMessageId.set(oldestMessageId);
        this._newestMessageId.set(newestMessageId);
        this._anchorMessageId.set(anchorMessageId);
        this.updateRoomMessages(roomId, messages.map((message) => this.mapMessage(message)));
      });
    });

    connection.on("ReceiveMessage", (message: ChatMessageDto) => {
      this.ngZone.run(() => {
        const roomId = message.roomId ?? message.RoomId ?? this.joinedRoomId;

        if (!roomId) {
          return;
        }

        const mapped = this.mapMessage(message);

        // Trong Context Mode (hasNewer = true), user đang xem lịch sử — không append vào list
        // Tin nhắn mới sẽ xuất hiện khi user quay về Live Mode
        if (!this._hasNewer()) {
          this.appendRoomMessage(roomId, mapped);
        }

        // <-- THÊM: bắn notification nếu không phải tin của mình
        if (mapped.author !== "me") {
          const senderName = mapped.senderName || "AMT Chat";
          const body = formatMessagePreview(mapped.content, mapped.type) || "...";
          this.notificationService.notify(senderName, body);
        }
      });
    });

    connection.onreconnecting(() => {
      this.ngZone.run(() => this._status.set("reconnecting"));
    });

    connection.onreconnected(() => {
      this.ngZone.run(() => this._status.set("connected"));
    });

    connection.onclose(() => {
      this.ngZone.run(() => this._status.set("disconnected"));
    });
  }

  private mapRoomSummary(room: RoomSummaryDto): ConversationPreview {
    const roomId = room.roomId ?? room.RoomId ?? "";
    const isGroup = room.isGroup ?? room.IsGroup ?? false;
    const otherUserAvatar = room.otherUserAvatar ?? room.OtherUserAvatar ?? null;
    const otherUsername =
      room.otherUsername ?? room.OtherUsername ?? room.otherUserUsername ?? room.OtherUserUsername ?? null;
    const lastMessageSentAt = room.lastMessageSentAt ?? room.LastMessageSentAt ?? null;
    const unreadCount = room.unreadCount ?? room.UnreadCount ?? 0;
    const name = this.conversationFormat.getRoomDisplayName(room);
    const lastMessage =
        (room.lastMessageContent ?? room.LastMessageContent)?.trim() ||
        this.conversationFormat.emptyRoomMessage;

    return {
      id: roomId,
      type: isGroup ? "group" : "direct",
      name,
      username: isGroup ? undefined : otherUsername?.trim() || undefined,
      avatarUrl: isGroup ? null : otherUserAvatar,
      message: this.conversationFormat.getLastMessagePreview(room, lastMessage),
      time: this.conversationFormat.formatSentAt(lastMessageSentAt),
      unread: unreadCount,
      online: false,
      messages: [],
    };
  }

  private mapMessage(message: ChatMessageDto): ConversationPreview["messages"][number] {
    const isMine = message.isMine ?? message.IsMine ?? false;
    const senderId = String(message.senderId ?? message.SenderId ?? "");
    const currentUserId = this.tokenService.getUserData()?.id ?? "";
    const sentAt = message.sentAt ?? message.SentAt ?? null;
    const isOwnMessage = isMine || (senderId && senderId === currentUserId);
    const type = this.conversationFormat.normalizeMessageType(message.type ?? message.Type);
    const stickerUrl = this.resolveStickerUrl(message.stickerUrl ?? message.StickerUrl ?? null);
    const replyToType = this.conversationFormat.normalizeReplyMessageType(
        message.replyToType ?? message.ReplyToType,
        message.replyToStickerUrl ?? message.ReplyToStickerUrl,
        message.replyToContent ?? message.ReplyToContent
    );
    const replyToStickerUrl = this.resolveStickerUrl(
        message.replyToStickerUrl ?? message.ReplyToStickerUrl ?? null
    );
    const content = message.content ?? message.Content ?? "";

    return {
      id: message.id ?? message.Id ?? crypto.randomUUID(),
      author: isOwnMessage ? "me" : "them",
      senderName: message.senderName ?? message.SenderName ?? "",
      senderUsername: message.senderUsername ?? message.SenderUsername ?? undefined,
      senderAvatarUrl: message.senderAvatarUrl ?? message.SenderAvatarUrl ?? null,
      content,
      type,
      stickerUrl,
      time: this.conversationFormat.formatSentAt(sentAt),
      status: isOwnMessage ? "sent" : undefined,
      replyToMessageId: message.replyToMessageId ?? message.ReplyToMessageId ?? null,
      replyToContent: message.replyToContent ?? message.ReplyToContent ?? null,
      replyToSenderName: message.replyToSenderName ?? message.ReplyToSenderName ?? null,
      replyToType,
      replyToStickerUrl,
    };
  }

  private resolveAssetUrl(url: string | null | undefined): string | null {
    return this.assetUrlService.resolve(url, this.assetBaseUrl);
  }

  /** Sticker asset nằm dưới /assets/ — dùng API_ASSET_BASE_URL thay vì domainApi */
  private resolveStickerUrl(url: string | null | undefined): string | null {
    return this.assetUrlService.resolve(url, API_ASSET_BASE_URL);
  }

  private updateRoomMessages(
      roomId: ChatEntityId,
      messages: ConversationPreview["messages"]
  ): void {
    this.messagesByRoomId.set(roomId, messages);

    this._rooms.update((rooms) =>
        this.mergeRoomsWithDrafts(
            rooms.map((room) => (room.id === roomId ? { ...room, messages } : room))
        )
    );
  }

  private prependRoomMessages(
      roomId: ChatEntityId,
      messages: ConversationPreview["messages"]
  ): void {
    const existing = this.messagesByRoomId.get(roomId) ?? [];
    const combined = [...messages, ...existing];
    this.messagesByRoomId.set(roomId, combined);

    this._rooms.update((rooms) =>
        this.mergeRoomsWithDrafts(
            rooms.map((room) => (room.id === roomId ? { ...room, messages: combined } : room))
        )
    );
  }

  private appendRoomMessages(
      roomId: ChatEntityId,
      messages: ConversationPreview["messages"]
  ): void {
    const existing = this.messagesByRoomId.get(roomId) ?? [];
    const combined = [...existing, ...messages];
    this.messagesByRoomId.set(roomId, combined);

    this._rooms.update((rooms) =>
        this.mergeRoomsWithDrafts(
            rooms.map((room) => (room.id === roomId ? { ...room, messages: combined } : room))
        )
    );
  }

  private appendRoomMessage(
      roomId: ChatEntityId,
      message: ConversationPreview["messages"][number]
  ): void {
    const messages = [...(this.messagesByRoomId.get(roomId) ?? []), message];
    this.messagesByRoomId.set(roomId, messages);

    this._rooms.update((rooms) =>
        this.mergeRoomsWithDrafts(
            rooms.map((room) =>
                room.id === roomId
                    ? {
                      ...room,
                      messages,
                      message: this.conversationFormat.getMessagePreview(message),
                      time: message.time,
                    }
                    : room
            )
        )
    );
  }

  private mergeRoomsWithDrafts(rooms: ConversationPreview[]): ConversationPreview[] {
    const roomIds = new Set(rooms.map((room) => room.id));
    const draftRooms = Array.from(this.draftRooms.values()).filter((room) => !roomIds.has(room.id));

    return [...draftRooms, ...rooms];
  }

}
