import { Injectable } from "@angular/core";
import { CONVERSATION_DEFAULTS } from "../../../core/constants";
import { formatMessagePreview } from "../../../shared/utils/display.util";
import {
  ConversationMessage,
  ConversationMessageType,
} from "../models/conversation.model";
import { RoomSummaryDto } from "../models/room-summary.model";

@Injectable({
  providedIn: "root",
})
export class ConversationFormatService {
  readonly emptyRoomMessage = CONVERSATION_DEFAULTS.emptyRoomMessage;
  readonly defaultGroupName = CONVERSATION_DEFAULTS.groupName;
  readonly defaultDirectName = CONVERSATION_DEFAULTS.directName;

  formatSentAt(value: string | null): string {
    if (!value) {
      return "";
    }

    const sentAt = new Date(value);

    if (Number.isNaN(sentAt.getTime())) {
      return "";
    }

    const now = new Date();

    if (sentAt.toDateString() === now.toDateString()) {
      return sentAt.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);

    if (sentAt.toDateString() === yesterday.toDateString()) {
      return "Hôm qua";
    }

    return sentAt.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  getRoomDisplayName(room: RoomSummaryDto): string {
    const isGroup = room.isGroup ?? room.IsGroup ?? false;
    const roomName = room.roomName ?? room.RoomName;
    const otherUserName = room.otherUserName ?? room.OtherUserName;

    if (isGroup) {
      return roomName?.trim() || this.defaultGroupName;
    }

    return otherUserName?.trim() || roomName?.trim() || this.defaultDirectName;
  }

  getLastMessagePreview(room: RoomSummaryDto, lastMessage: string): string {
    const isGroup = room.isGroup ?? room.IsGroup ?? false;
    const senderName = (room.lastMessageSenderName ?? room.LastMessageSenderName)?.trim();

    if (!isGroup || !senderName || lastMessage === this.emptyRoomMessage) {
      return lastMessage;
    }

    return `${senderName}: ${lastMessage}`;
  }

  getMessagePreview(message: ConversationMessage): string {
    return formatMessagePreview(message.content, message.type);
  }

  normalizeMessageType(value: string | number | null | undefined): ConversationMessageType {
    if (value === 1 || value === "1") {
      return "Sticker";
    }

    if (typeof value === "string" && value.toLowerCase() === "sticker") {
      return "Sticker";
    }

    return "Text";
  }

  normalizeReplyMessageType(
    value: string | number | null | undefined,
    stickerUrl: string | null | undefined,
    content: string | null | undefined
  ): ConversationMessageType | null {
    if (value) {
      return this.normalizeMessageType(value);
    }

    if (stickerUrl || content === "[Sticker]") {
      return "Sticker";
    }

    return null;
  }
}
