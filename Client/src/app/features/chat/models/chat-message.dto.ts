import { ChatEntityId } from "./conversation.model";

export interface ChatMessageDto {
  id?: ChatEntityId;
  content?: string | null;
  senderName?: string | null;
  senderUsername?: string | null;
  senderAvatarUrl?: string | null;
  sentAt?: string | null;
  type?: string | number | null;
  stickerUrl?: string | null;
  roomId?: ChatEntityId;
  senderId?: ChatEntityId;
  replyToMessageId?: ChatEntityId | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  replyToType?: string | number | null;
  replyToStickerUrl?: string | null;
  Id?: ChatEntityId;
  Content?: string | null;
  SenderName?: string | null;
  SenderUsername?: string | null;
  SenderAvatarUrl?: string | null;
  SentAt?: string | null;
  Type?: string | number | null;
  StickerUrl?: string | null;
  RoomId?: ChatEntityId;
  SenderId?: ChatEntityId;
  ReplyToMessageId?: ChatEntityId | null;
  ReplyToContent?: string | null;
  ReplyToSenderName?: string | null;
  ReplyToType?: string | number | null;
  ReplyToStickerUrl?: string | null;
  isMine?: boolean;
  IsMine?: boolean;
}
