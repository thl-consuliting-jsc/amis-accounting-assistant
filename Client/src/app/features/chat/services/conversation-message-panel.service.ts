import { Injectable, signal, WritableSignal } from "@angular/core";
import { MessageReaction } from "../models/message-reaction.model";
import {
  ChatEntityId,
  ConversationDisplayMessage,
  ConversationMessage,
} from "../models/conversation.model";

@Injectable()
export class ConversationMessagePanelService {
  readonly markedMessageIds = signal(new Set<ChatEntityId>());
  readonly selectedMessageIds = signal(new Set<ChatEntityId>());
  readonly deletedMessageIds = signal(new Set<ChatEntityId>());

  buildDisplayMessages(
    sourceMessages: ConversationMessage[],
    reactionsByMessageId: Map<ChatEntityId, MessageReaction[]>
  ): ConversationDisplayMessage[] {
    const visibleMessages = sourceMessages.filter(
      (message) => !this.deletedMessageIds().has(message.id)
    );
    const messageById = new Map(visibleMessages.map((message) => [message.id, message]));

    return visibleMessages.map((message) => {
      const replyTarget = message.replyToMessageId
        ? messageById.get(message.replyToMessageId) ?? null
        : null;

      return {
        ...message,
        replyToContent: message.replyToContent ?? replyTarget?.content ?? null,
        replyToSenderName: message.replyToSenderName ?? replyTarget?.senderName ?? null,
        replyToType: message.replyToType ?? replyTarget?.type ?? null,
        replyToStickerUrl: message.replyToStickerUrl ?? replyTarget?.stickerUrl ?? null,
        marked: this.markedMessageIds().has(message.id),
        selected: this.selectedMessageIds().has(message.id),
        reactions: reactionsByMessageId.get(message.id) ?? [],
      };
    });
  }

  resetPanelState(): void {
    this.markedMessageIds.set(new Set());
    this.selectedMessageIds.set(new Set());
    this.deletedMessageIds.set(new Set());
  }

  deleteMessageLocally(messageId: ChatEntityId): void {
    this.deletedMessageIds.update((messageIds) => new Set(messageIds).add(messageId));
  }

  toggleMarked(messageId: ChatEntityId): void {
    this.toggleMessageId(this.markedMessageIds, messageId);
  }

  toggleSelected(messageId: ChatEntityId): void {
    this.toggleMessageId(this.selectedMessageIds, messageId);
  }

  private toggleMessageId(
    messageIdsSignal: WritableSignal<Set<ChatEntityId>>,
    messageId: ChatEntityId
  ): void {
    messageIdsSignal.update((messageIds) => {
      const nextMessageIds = new Set(messageIds);

      if (nextMessageIds.has(messageId)) {
        nextMessageIds.delete(messageId);
      } else {
        nextMessageIds.add(messageId);
      }

      return nextMessageIds;
    });
  }
}
