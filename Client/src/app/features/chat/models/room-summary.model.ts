import { ChatEntityId } from "./conversation.model";

export interface RoomSummaryDto {
  roomId?: ChatEntityId;
  roomName?: string | null;
  isGroup?: boolean;
  lastMessageContent?: string | null;
  lastMessageSenderName?: string | null;
  lastMessageSentAt?: string | null;
  unreadCount?: number;
  otherUserName?: string | null;
  otherUsername?: string | null;
  otherUserUsername?: string | null;
  otherUserAvatar?: string | null;
  RoomId?: ChatEntityId;
  RoomName?: string | null;
  IsGroup?: boolean;
  LastMessageContent?: string | null;
  LastMessageSenderName?: string | null;
  LastMessageSentAt?: string | null;
  UnreadCount?: number;
  OtherUserName?: string | null;
  OtherUsername?: string | null;
  OtherUserUsername?: string | null;
  OtherUserAvatar?: string | null;
}
