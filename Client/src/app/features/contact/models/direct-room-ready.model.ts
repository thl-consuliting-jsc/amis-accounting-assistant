import { ContactItem } from "./contact.model";
import { ChatEntityId } from "../../chat/models/conversation.model";

export interface DirectRoomReadyEvent {
  roomId: ChatEntityId;
  contact: ContactItem;
}
