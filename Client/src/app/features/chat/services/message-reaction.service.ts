import { Injectable, signal } from "@angular/core";
import { ChatEntityId } from "../models/conversation.model";
import { MessageReaction } from "../models/message-reaction.model";

@Injectable({
  providedIn: "root",
})
export class MessageReactionService {
  private readonly reactionsByMessageId = signal(new Map<ChatEntityId, MessageReaction[]>());

  readonly reactionsMap = this.reactionsByMessageId.asReadonly();

  getReactions(messageId: ChatEntityId): MessageReaction[] {
    return this.reactionsByMessageId().get(messageId) ?? [];
  }

  toggleReaction(messageId: ChatEntityId, shortcode: string): void {
    this.reactionsByMessageId.update((reactionsMap) => {
      const nextMap = new Map(reactionsMap);
      const reactions = [...(nextMap.get(messageId) ?? [])];
      const myExistingReactionIndex = reactions.findIndex(r => r.reactedByMe);
      const targetReactionIndex = reactions.findIndex(r => r.shortcode === shortcode);

      if (myExistingReactionIndex !== -1 && myExistingReactionIndex === targetReactionIndex) {
        // Toggle it off
        const currentReaction = reactions[targetReactionIndex];
        if (currentReaction.count <= 1) {
          reactions.splice(targetReactionIndex, 1);
        } else {
          reactions[targetReactionIndex] = {
            ...currentReaction,
            count: currentReaction.count - 1,
            reactedByMe: false,
          };
        }
      } else {
        // Remove existing reaction if any
        if (myExistingReactionIndex !== -1) {
          const existing = reactions[myExistingReactionIndex];
          if (existing.count <= 1) {
            reactions.splice(myExistingReactionIndex, 1);
          } else {
            reactions[myExistingReactionIndex] = {
              ...existing,
              count: existing.count - 1,
              reactedByMe: false,
            };
          }
        }

        // Add or increment the new reaction
        const newTargetIndex = reactions.findIndex(r => r.shortcode === shortcode);
        if (newTargetIndex === -1) {
          reactions.push({ shortcode, count: 1, reactedByMe: true });
        } else {
          const currentReaction = reactions[newTargetIndex];
          reactions[newTargetIndex] = {
            ...currentReaction,
            count: currentReaction.count + 1,
            reactedByMe: true,
          };
        }
      }

      if (reactions.length === 0) {
        nextMap.delete(messageId);
      } else {
        nextMap.set(messageId, reactions);
      }

      return nextMap;
    });
  }

  clear(): void {
    this.reactionsByMessageId.set(new Map());
  }
}
