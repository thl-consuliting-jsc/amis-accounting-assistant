import {
  ConversationMessage,
  ConversationMessageType,
  ConversationPreview,
} from "../../features/chat/models/conversation.model";
import { environment } from "../../../environments/environment";

export function formatInitials(value: string): string {
  return value
    .split(/[.@_\-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatMessagePreview(
  content: string,
  type: ConversationMessageType
): string {
  return type === "Sticker" ? "[Sticker]" : content;
}

export function formatReplyAuthorLabel(message: ConversationMessage): string {
  return message.author === "me" ? "Ban" : message.senderName || "Doi phuong";
}

export function formatConversationSubtitle(conversation: ConversationPreview): string {
  if (conversation.type === "group") {
    return `${conversation.participantCount ?? 0} thành viên`;
  }

  return conversation.online ? "Dang hoat dong" : "Ngoại tuyến";
}

export function trimAssetUrl(url: string | null | undefined): string {
  const normalizedUrl = url?.trim();

  if (!normalizedUrl) {
    return "";
  }

  if (/^(?:[a-z][a-z\d+\-.]*:|\/\/)/i.test(normalizedUrl)) {
    return normalizedUrl;
  }

  const baseUrl = environment.domainApi.replace(/\/+$/, "");
  const assetPath = normalizedUrl.replace(/^\/+/, "");

  return `${baseUrl}/${assetPath}`;
}

export function isStickerMessage(message: ConversationMessage): boolean {
  return message.type === "Sticker" && Boolean(message.stickerUrl?.trim());
}

export function shouldShowReplyQuote(message: ConversationMessage): boolean {
  return Boolean(
    message.replyToMessageId &&
      (message.replyToContent || message.replyToStickerUrl || message.replyToType)
  );
}

export function isReplyToSticker(message: ConversationMessage): boolean {
  return message.replyToType === "Sticker" || Boolean(message.replyToStickerUrl);
}
