import { CommonModule } from "@angular/common";
import {
  Component,
  HostListener,
  input,
  output,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorArrowBendUpLeft,
  phosphorBookmarkSimple,
  phosphorCheckSquare,
  phosphorCopy,
  phosphorTrash,
} from "@ng-icons/phosphor-icons/regular";
import { ConversationMessage } from "../../models/conversation.model";
import {
  MessageContextMenuAction,
  MessageContextMenuPosition,
} from "../../models/message-context-menu.model";

@Component({
  selector: "app-message-context-menu",
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: "./message-context-menu.component.html",
  styleUrl: "./message-context-menu.component.scss",
})
export class MessageContextMenuComponent {
  readonly menuPosition = input<MessageContextMenuPosition | null>(null);
  readonly messageCopied = output<ConversationMessage>();
  readonly messageAction = output<{
    action: MessageContextMenuAction;
    message: ConversationMessage;
  }>();
  readonly menuClosed = output<void>();

  protected readonly replyIcon = phosphorArrowBendUpLeft;
  protected readonly markIcon = phosphorBookmarkSimple;
  protected readonly selectIcon = phosphorCheckSquare;
  protected readonly copyIcon = phosphorCopy;
  protected readonly deleteIcon = phosphorTrash;

  @HostListener("document:pointerdown", ["$event"])
  protected closeFromDocument(event: PointerEvent): void {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest(".message-context-menu")) {
      return;
    }

    this.menuClosed.emit();
  }

  protected runAction(action: MessageContextMenuAction): void {
    const menuPosition = this.menuPosition();

    if (!menuPosition) {
      return;
    }

    this.messageAction.emit({
      action,
      message: menuPosition.message,
    });
  }

  protected copyMessage(): void {
    const menuPosition = this.menuPosition();

    if (!menuPosition) {
      return;
    }

    this.messageCopied.emit(menuPosition.message);
  }
}
