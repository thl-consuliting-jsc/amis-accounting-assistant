import { ConversationMessage, ConversationPreview } from "./conversation.model";

export type ProfileOpenRequest =
  | { scope: "conversation"; conversation: ConversationPreview }
  | { scope: "message"; conversation: ConversationPreview; message: ConversationMessage };
