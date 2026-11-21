import { ChatMessageDto } from "./chat-message.dto";
import { ChatEntityId } from "./conversation.model";

/**
 * DTO trả về khi load tin nhắn từ server.
 * Match với server MessagePageDTO.
 */
export interface MessagePageDto {
  /** Danh sách tin nhắn, sắp xếp tăng dần theo thời gian (cũ → mới) */
  messages: ChatMessageDto[];
  Messages?: ChatMessageDto[];

  /** Còn tin nhắn cũ hơn để load không? */
  hasMore: boolean;
  HasMore?: boolean;

  /** Còn tin nhắn mới hơn để load không? true = đang ở Context Mode */
  hasNewer?: boolean;
  HasNewer?: boolean;

  /** Id của tin nhắn cũ nhất trong batch này (cursor cho LoadMoreMessages) */
  oldestMessageId: ChatEntityId | null;
  OldestMessageId?: ChatEntityId | null;

  /** Id của tin nhắn mới nhất trong batch này (cursor cho LoadNewerMessages) */
  newestMessageId?: ChatEntityId | null;
  NewestMessageId?: ChatEntityId | null;

  /** Chỉ set khi jump đến message cụ thể — client scroll + highlight message này */
  anchorMessageId?: ChatEntityId | null;
  AnchorMessageId?: ChatEntityId | null;
}
