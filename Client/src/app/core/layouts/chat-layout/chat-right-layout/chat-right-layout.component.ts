import { CommonModule } from "@angular/common";
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorArrowLeft,
  phosphorBookmarkSimple,
  phosphorDotsThreeVertical,
  phosphorPaperPlaneRight,
  phosphorPaperclip,
  phosphorSmiley,
  phosphorX,
} from "@ng-icons/phosphor-icons/regular";
import {
  ChatEntityId,
  ConversationMessage,
  ConversationMessageSendRequest,
  ConversationPreview,
} from "../../../../features/chat/models/conversation.model";
import { ProfileOpenRequest } from "../../../../features/chat/models/profile-open-request.model";
import {
  MessageContextMenuAction,
  MessageContextMenuPosition,
  MessageReactionPickerPosition,
} from "../../../../features/chat/models/message-context-menu.model";
import {
  EmojiPickerComponent,
  MessageContextMenuComponent,
  MessageReactionPickerComponent,
} from "../../../../features/chat/components";
import { ConversationMessagePanelService } from "../../../../features/chat/services/conversation-message-panel.service";
import { MessageReactionService } from "../../../../features/chat/services/message-reaction.service";
import { Sticker } from "../../../../features/chat/models/sticker.model";
import {
  formatConversationSubtitle,
  formatInitials,
  formatMessagePreview,
  formatReplyAuthorLabel,
  isReplyToSticker,
  isStickerMessage,
  shouldShowReplyQuote,
  trimAssetUrl,
} from "../../../../shared/utils/display.util";
import { EmojiHtmlPipe } from "../../../../shared/pipes";
import { MessageBoxComponent } from "../../../../shared/ui/message-box";

@Component({
  selector: "app-chat-right-layout",
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    EmojiPickerComponent,
    EmojiHtmlPipe,
    MessageBoxComponent,
    MessageContextMenuComponent,
    MessageReactionPickerComponent,
  ],
  providers: [ConversationMessagePanelService],
  templateUrl: "./chat-right-layout.component.html",
  styleUrl: "./chat-right-layout.component.scss",
})
export class ChatRightLayoutComponent {
  private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly messageReactionService = inject(MessageReactionService);
  private readonly messagePanel = inject(ConversationMessagePanelService);

  readonly activeConversation = input<ConversationPreview | null>(null);
  readonly showBackButton = input(false);
  readonly hasMore = input(false);
  readonly hasNewer = input(false);
  readonly anchorMessageId = input<ChatEntityId | null>(null);
  readonly backRequested = output<void>();
  readonly messageSent = output<ConversationMessageSendRequest>();
  readonly composerFocused = output<void>();
  readonly composerBlurred = output<void>();
  readonly profileRequested = output<ProfileOpenRequest>();
  readonly loadMoreRequested = output<void>();
  readonly loadNewerRequested = output<void>();
  readonly jumpToMessageRequested = output<ChatEntityId>();
  readonly jumpToLatestRequested = output<void>();
  readonly anchorConsumed = output<void>();

  private readonly messageList = viewChild<ElementRef<HTMLElement>>("messageList");
  private readonly composerInput = viewChild<ElementRef<HTMLTextAreaElement>>("composerInput");

  protected readonly moreIcon = phosphorDotsThreeVertical;
  protected readonly backIcon = phosphorArrowLeft;
  protected readonly paperclipIcon = phosphorPaperclip;
  protected readonly smileIcon = phosphorSmiley;
  protected readonly reactIcon = phosphorSmiley;
  protected readonly sendIcon = phosphorPaperPlaneRight;
  protected readonly closeIcon = phosphorX;
  protected readonly markIcon = phosphorBookmarkSimple;
  protected readonly draftMessage = signal("");
  protected readonly messageContextMenu = signal<MessageContextMenuPosition | null>(null);
  protected readonly replyToMessage = signal<ConversationMessage | null>(null);
  protected readonly highlightedMessageId = signal<ChatEntityId | null>(null);
  protected readonly pendingDeleteMessage = signal<ConversationMessage | null>(null);
  protected readonly isEmojiPickerOpen = signal(false);
  protected readonly reactionPicker = signal<MessageReactionPickerPosition | null>(null);
  private shouldKeepComposerFocused = false;
  private highlightTimeoutId: number | null = null;
  private isLoadingMore = false;
  private previousScrollHeight = 0;
  private previousScrollTop = 0;
  private isNearBottom = true;
  private loadMoreResetTimeoutId: number | null = null;
  private isLoadingNewer = false;
  private loadNewerResetTimeoutId: number | null = null;

  private readonly messageReactions = computed(() => this.messageReactionService.reactionsMap());

  protected readonly messages = computed(() =>
    this.messagePanel.buildDisplayMessages(
      this.activeConversation()?.messages ?? [],
      this.messageReactions()
    )
  );
  protected readonly canSendMessage = computed(() => this.draftMessage().trim().length > 0);

  constructor() {
    effect(() => {
      const conversationId = this.activeConversation()?.id;
      const messages = this.messages();
      const messageCount = messages.length;

      window.requestAnimationFrame(() => {
        const element = this.messageList()?.nativeElement;

        if (!element) {
          return;
        }

        if (this.isLoadingMore && this.previousScrollHeight > 0) {
          const heightDiff = element.scrollHeight - this.previousScrollHeight;
          element.scrollTop = heightDiff + this.previousScrollTop;
          this.resetLoadMoreState();
          return;
        }

        if (this.isLoadingNewer) {
          this.resetLoadNewerState();
          return;
        }

        if (this.anchorMessageId()) {
          return;
        }

        if (!conversationId || messageCount === 0) {
          this.isNearBottom = true;
        }

        if (this.isNearBottom) {
          this.scrollToLatestMessage();
        }
      });
    });

    effect(() => {
      const anchorId = this.anchorMessageId();

      if (!anchorId) {
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const messageList = this.messageList()?.nativeElement;
          const target = messageList?.querySelector<HTMLElement>(`[data-message-id="${anchorId}"]`);

          if (target) {
            target.scrollIntoView({ behavior: "instant", block: "center" });
            this.highlightMessage(anchorId);
          }

          this.anchorConsumed.emit();
        });
      });
    });

    effect(() => {
      if (this.activeConversation()?.id) {
        this.messageContextMenu.set(null);
        this.reactionPicker.set(null);
        this.replyToMessage.set(null);
        this.pendingDeleteMessage.set(null);
        this.isEmojiPickerOpen.set(false);
        this.messageReactionService.clear();
        this.messagePanel.resetPanelState();
        this.focusComposerInput();
      }
    });
  }

  private resetLoadMoreState(): void {
    this.isLoadingMore = false;
    this.previousScrollHeight = 0;
    this.previousScrollTop = 0;

    if (this.loadMoreResetTimeoutId !== null) {
      window.clearTimeout(this.loadMoreResetTimeoutId);
      this.loadMoreResetTimeoutId = null;
    }
  }

  private resetLoadNewerState(): void {
    this.isLoadingNewer = false;

    if (this.loadNewerResetTimeoutId !== null) {
      window.clearTimeout(this.loadNewerResetTimeoutId);
      this.loadNewerResetTimeoutId = null;
    }
  }

  protected sendMessage(): void {
    const content = this.draftMessage();
    const replyToMessageId = this.replyToMessage()?.id ?? null;

    if (!content.trim()) {
      return;
    }

    this.messageSent.emit({
      content,
      replyToMessageId,
    });
    this.draftMessage.set("");
    this.replyToMessage.set(null);
    this.isEmojiPickerOpen.set(false);
    this.isNearBottom = true;

    if (this.hasNewer()) {
      this.jumpToLatestRequested.emit();
    } else {
      this.scrollToLatestMessage();
    }

    const textarea = this.composerInput()?.nativeElement;
    if (textarea) {
      textarea.value = "";
      this.resizeTextarea(textarea);
    }
  }

  protected handleComposerInput(event: Event): void {
    const textarea = event.target;

    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    this.draftMessage.set(textarea.value);
    this.resizeTextarea(textarea);
  }

  protected handleComposerFocus(): void {
    this.composerFocused.emit();
  }

  protected handleComposerBlur(): void {
    window.setTimeout(() => {
      if (this.shouldKeepComposerFocused) {
        this.focusComposerInput();
        return;
      }

      this.composerBlurred.emit();
    });
  }

  protected openMessageContextMenu(event: MouseEvent, message: ConversationMessage): void {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 176;
    const menuHeight = this.isOwnMessage(message) ? 230 : 184;

    this.messageContextMenu.set({
      message,
      isOwn: this.isOwnMessage(message),
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 8),
    });
  }

  protected async copyMessageContent(message: ConversationMessage): Promise<void> {
    await this.copyText(message.content);
    this.messageContextMenu.set(null);
    this.focusComposerInput();
  }

  protected handleMessageAction(event: {
    action: MessageContextMenuAction;
    message: ConversationMessage;
  }): void {
    const { action, message } = event;

    if (action === "reply") {
      this.replyToMessage.set(message);
    }

    if (action === "mark") {
      this.messagePanel.toggleMarked(message.id);
    }

    if (action === "select") {
      this.messagePanel.toggleSelected(message.id);
    }

    if (action === "delete" && this.isOwnMessage(message)) {
      this.pendingDeleteMessage.set(message);
    }

    this.messageContextMenu.set(null);

    if (action !== "delete") {
      this.focusComposerInput();
    }
  }

  protected clearReply(): void {
    this.replyToMessage.set(null);
    this.focusComposerInput();
  }

  protected toggleEmojiPicker(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isEmojiPickerOpen.update((isOpen) => !isOpen);
  }

  protected selectEmoji(token: string): void {
    this.insertTextAtCursor(token);
  }

  protected selectSticker(sticker: Sticker): void {
    this.messageSent.emit({
      content: null,
      replyToMessageId: this.replyToMessage()?.id ?? null,
      stickerId: sticker.id,
    });
    this.replyToMessage.set(null);
    this.isEmojiPickerOpen.set(false);
    this.isNearBottom = true;

    if (this.hasNewer()) {
      this.jumpToLatestRequested.emit();
    } else {
      this.scrollToLatestMessage();
    }

    this.focusComposerInput();
  }

  protected confirmDeleteMessage(): void {
    const message = this.pendingDeleteMessage();

    if (!message) {
      return;
    }

    this.messagePanel.deleteMessageLocally(message.id);

    if (this.replyToMessage()?.id === message.id) {
      this.replyToMessage.set(null);
    }

    this.pendingDeleteMessage.set(null);
    this.focusComposerInput();
  }

  protected cancelDeleteMessage(): void {
    this.pendingDeleteMessage.set(null);
    this.focusComposerInput();
  }

  protected scrollToReplyTarget(event: MouseEvent, messageId: ChatEntityId | null | undefined): void {
    event.preventDefault();
    event.stopPropagation();

    if (!messageId) {
      return;
    }

    const messageList = this.messageList()?.nativeElement;
    const target = messageList?.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);

    if (!target) {
      this.jumpToMessageRequested.emit(messageId);
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    this.highlightMessage(messageId);
  }

  protected jumpToLatest(): void {
    this.isNearBottom = true;
    this.scrollToLatestMessage();
  }

  @HostListener("pointerdown", ["$event"])
  protected focusComposerFromPanel(event: PointerEvent): void {
    if (!this.activeConversation()) {
      return;
    }

    const textarea = this.composerInput()?.nativeElement;

    if (!textarea) {
      return;
    }

    this.shouldKeepComposerFocused = true;

    if (event.target === textarea) {
      return;
    }

    if (this.shouldPreventInternalFocusTransfer(event.target)) {
      event.preventDefault();
    }

    this.focusComposerInput();
  }

  @HostListener("document:pointerdown", ["$event"])
  protected closeContextMenuFromDocument(event: PointerEvent): void {
    const target = event.target;
    const isInsidePanel = target instanceof Node && this.hostElement.nativeElement.contains(target);

    this.shouldKeepComposerFocused = isInsidePanel;

    if (
      target instanceof HTMLElement &&
      target.closest(
        ".message-context-menu, .message-reaction-popover, .message-react-button, .emoji-popover, .emoji-toggle"
      )
    ) {
      return;
    }

    this.messageContextMenu.set(null);
    this.reactionPicker.set(null);
    this.isEmojiPickerOpen.set(false);
  }

  @HostListener("document:keydown.escape")
  protected closeContextMenuFromEscape(): void {
    this.messageContextMenu.set(null);
    this.reactionPicker.set(null);
    this.isEmojiPickerOpen.set(false);
  }

  protected onMessageListScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const threshold = 50; // pixels from top
    const bottomThreshold = 80; // pixels from bottom

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    this.isNearBottom = distanceFromBottom < bottomThreshold;

    // Khi user scroll gần đầu danh sách và còn tin nhắn cũ hơn
    if (scrollTop < threshold && this.hasMore() && !this.isLoadingMore) {
      this.isLoadingMore = true;
      this.previousScrollHeight = element.scrollHeight;
      this.previousScrollTop = element.scrollTop;

      this.loadMoreRequested.emit();

      if (this.loadMoreResetTimeoutId !== null) {
        window.clearTimeout(this.loadMoreResetTimeoutId);
      }

      this.loadMoreResetTimeoutId = window.setTimeout(() => {
        this.isLoadingMore = false;
        this.previousScrollHeight = 0;
        this.previousScrollTop = 0;
        this.loadMoreResetTimeoutId = null;
      }, 1500);
    }

    // Khi user scroll gần đáy danh sách trong Context Mode và còn tin nhắn mới hơn
    if (distanceFromBottom < threshold && this.hasNewer() && !this.isLoadingNewer) {
      this.isLoadingNewer = true;
      this.loadNewerRequested.emit();

      if (this.loadNewerResetTimeoutId !== null) {
        window.clearTimeout(this.loadNewerResetTimeoutId);
      }

      this.loadNewerResetTimeoutId = window.setTimeout(() => {
        this.isLoadingNewer = false;
        this.loadNewerResetTimeoutId = null;
      }, 1500);
    }
  }

  protected handleComposerKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      this.insertTabAtCursor(event);
    }
  }

  protected isOwnMessage(message: ConversationMessage): boolean {
    return message.author === "me";
  }

  protected isStickerMessage(message: ConversationMessage): boolean {
    return isStickerMessage(message);
  }

  protected stickerUrl(message: ConversationMessage): string {
    return message.stickerUrl ?? "";
  }

  protected shouldShowReplyQuote(message: ConversationMessage): boolean {
    return shouldShowReplyQuote(message);
  }

  protected isReplyToSticker(message: ConversationMessage): boolean {
    return isReplyToSticker(message);
  }

  protected replyStickerUrl(message: ConversationMessage): string {
    return message.replyToStickerUrl ?? "";
  }

  protected isGroupConversation(conversation: ConversationPreview): boolean {
    return conversation.type === "group";
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

  protected conversationSubtitle(conversation: ConversationPreview): string {
    return formatConversationSubtitle(conversation);
  }

  protected openConversationProfile(
    conversation: ConversationPreview,
    event: MouseEvent
  ): void {
    event.stopPropagation();
    this.profileRequested.emit({ scope: "conversation", conversation });
  }

  protected openMessageProfile(
    conversation: ConversationPreview,
    message: ConversationMessage,
    event: MouseEvent
  ): void {
    event.stopPropagation();
    this.profileRequested.emit({ scope: "message", conversation, message });
  }

  protected senderAvatarUrl(message: ConversationMessage): string {
    return trimAssetUrl(message.senderAvatarUrl);
  }

  protected senderInitials(message: ConversationMessage): string {
    return formatInitials(message.senderName || "AM");
  }

  protected replyAuthorLabel(message: ConversationMessage): string {
    return formatReplyAuthorLabel(message);
  }

  protected messagePreviewText(message: ConversationMessage): string {
    return formatMessagePreview(message.content, message.type);
  }

  protected openReactionPicker(event: MouseEvent, message: ConversationMessage): void {
    event.preventDefault();
    event.stopPropagation();

    const pickerWidth = 180;
    const pickerHeight = 45;
    const currentPicker = this.reactionPicker();

    if (currentPicker?.messageId === message.id) {
      this.reactionPicker.set(null);
      return;
    }

    this.messageContextMenu.set(null);
    this.reactionPicker.set({
      messageId: message.id,
      x: Math.min(event.clientX, window.innerWidth - pickerWidth - 8),
      y: Math.min(event.clientY, window.innerHeight - pickerHeight - 8),
    });
  }

  protected applyMessageReaction(shortcode: string): void {
    const picker = this.reactionPicker();

    if (!picker) {
      return;
    }

    this.messageReactionService.toggleReaction(picker.messageId, shortcode);
    this.reactionPicker.set(null);
  }

  protected toggleMessageReaction(messageId: ChatEntityId, shortcode: string): void {
    this.messageReactionService.toggleReaction(messageId, shortcode);
  }

  private scrollToLatestMessage(): void {
    window.requestAnimationFrame(() => {
      const element = this.messageList()?.nativeElement;

      if (!element) {
        return;
      }

      element.scrollTop = element.scrollHeight;
    });
  }

  private insertTabAtCursor(event: KeyboardEvent): void {
    const textarea = event.target;

    if (!(textarea instanceof HTMLTextAreaElement)) {
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const value = this.draftMessage();
    const nextValue = `${value.slice(0, selectionStart)}\t${value.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + 1;

    this.draftMessage.set(nextValue);

    window.requestAnimationFrame(() => {
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
      this.resizeTextarea(textarea);
    });
  }

  private resizeComposerInput(): void {
    window.requestAnimationFrame(() => {
      const textarea = this.composerInput()?.nativeElement;

      if (textarea) {
        this.resizeTextarea(textarea);
      }
    });
  }

  private focusComposerInput(): void {
    window.setTimeout(() => {
      const textarea = this.composerInput()?.nativeElement;

      if (textarea && document.activeElement !== textarea) {
        textarea.focus({ preventScroll: true });
      }
    });
  }

  private highlightMessage(messageId: ChatEntityId): void {
    this.highlightedMessageId.set(messageId);

    if (this.highlightTimeoutId !== null) {
      window.clearTimeout(this.highlightTimeoutId);
    }

    this.highlightTimeoutId = window.setTimeout(() => {
      this.highlightedMessageId.set(null);
      this.highlightTimeoutId = null;
    }, 1400);
  }

  private shouldPreventInternalFocusTransfer(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return true;
    }

    return !Boolean(
      target.closest(
        [
          "input",
          "textarea",
          "select",
          '[contenteditable="true"]',
          "[data-allow-text-selection]",
        ].join(", ")
      )
    );
  }

  private insertTextAtCursor(text: string): void {
    const textarea = this.composerInput()?.nativeElement;
    const currentValue = this.draftMessage();

    if (!textarea) {
      this.draftMessage.set(`${currentValue}${text}`);
      this.resizeComposerInput();
      return;
    }

    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const nextValue = `${currentValue.slice(0, selectionStart)}${text}${currentValue.slice(selectionEnd)}`;
    const nextCursorPosition = selectionStart + text.length;

    this.draftMessage.set(nextValue);

    window.requestAnimationFrame(() => {
      textarea.focus({ preventScroll: true });
      textarea.selectionStart = nextCursorPosition;
      textarea.selectionEnd = nextCursorPosition;
      this.resizeTextarea(textarea);
    });
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  private resizeTextarea(textarea: HTMLTextAreaElement): void {
    const maxHeight = parseFloat(window.getComputedStyle(textarea).maxHeight);

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }
}
