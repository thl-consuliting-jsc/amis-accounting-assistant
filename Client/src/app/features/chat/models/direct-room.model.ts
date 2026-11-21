import { ContactItem } from "../../contact/models/contact.model";
import { ChatEntityId } from "./conversation.model";

export interface DirectRoomOpenRequest {
  roomId: ChatEntityId;
  contact: ContactItem;
}

export interface DirectRoomReadyPayload {
  roomId?: ChatEntityId;
  RoomId?: ChatEntityId;
}
