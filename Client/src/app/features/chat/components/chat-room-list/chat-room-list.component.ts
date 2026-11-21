import { CommonModule } from "@angular/common";
import { Component, computed, input, output } from "@angular/core";
import { ConversationPreview } from "../../models/conversation.model";
import { EmojiHtmlPipe } from "../../../../shared/pipes";
import { formatInitials, trimAssetUrl } from "../../../../shared/utils/display.util";

@Component({
  selector: "app-chat-room-list",
  standalone: true,
  imports: [CommonModule, EmojiHtmlPipe],
  templateUrl: "./chat-room-list.component.html",
  styleUrl: "./chat-room-list.component.scss",
})
export class ChatRoomListComponent {
  readonly conversations = input<ConversationPreview[]>([]);
  readonly activeConversation = input<ConversationPreview | null>(null);
  readonly searchTerm = input("");

  readonly conversationSelected = output<ConversationPreview>();

  protected readonly filteredConversations = computed(() => {
    const keyword = this.searchTerm().trim().toLowerCase();
    const conversations = this.conversations();

    if (!keyword) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      return (
        conversation.name.toLowerCase().includes(keyword) ||
        conversation.message.toLowerCase().includes(keyword)
      );
    });
  });

  protected isActive(conversation: ConversationPreview): boolean {
    return this.activeConversation()?.id === conversation.id;
  }

  protected isDirectConversation(conversation: ConversationPreview): boolean {
    return conversation.type === "direct";
  }

  protected conversationAvatarUrl(conversation: ConversationPreview): string {
    return trimAssetUrl(conversation.avatarUrl);
  }

  protected conversationInitials(conversation: ConversationPreview): string {
    return formatInitials(conversation.name);
  }
}
