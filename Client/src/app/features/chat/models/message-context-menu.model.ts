import { ChatEntityId, ConversationMessage } from "./conversation.model";

export type MessageContextMenuAction = "reply" | "mark" | "select" | "copy" | "delete";

export interface MessageContextMenuPosition {
  message: ConversationMessage;
  isOwn: boolean;
  x: number;
  y: number;
}

export interface MessageReactionPickerPosition {
  messageId: ChatEntityId;
  x: number;
  y: number;
}
