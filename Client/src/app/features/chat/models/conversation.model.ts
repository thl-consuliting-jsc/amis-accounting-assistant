import { MessageReaction } from "./message-reaction.model";

export type ChatEntityId = string;
export type ConversationMessageAuthor = "me" | "them";
export type ConversationMessageType = "Text" | "Sticker";
export type ConversationType = "direct" | "group";

export interface ConversationMessage {
  id: ChatEntityId;
  author: ConversationMessageAuthor;
  senderName?: string;
  senderUsername?: string;
  senderAvatarUrl?: string | null;
  content: string;
  type: ConversationMessageType;
  stickerUrl?: string | null;
  time: string;
  status?: "sent" | "seen";
  replyToMessageId?: ChatEntityId | null;
  replyToContent?: string | null;
  replyToSenderName?: string | null;
  replyToType?: ConversationMessageType | null;
  replyToStickerUrl?: string | null;
  marked?: boolean;
  selected?: boolean;
}

export interface ConversationDisplayMessage extends ConversationMessage {
  reactions: MessageReaction[];
}

export interface ConversationMessageSendRequest {
  content?: string | null;
  replyToMessageId?: ChatEntityId | null;
  stickerId?: number | null;
}

export interface ConversationPreview {
  id: ChatEntityId;
  type: ConversationType;
  name: string;
  username?: string;
  avatarUrl: string | null;
  participantCount?: number;
  message: string;
  time: string;
  unread: number;
  online: boolean;
  messages: ConversationMessage[];
}
