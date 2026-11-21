import { Injectable, inject } from "@angular/core";
import { DirectChatService } from "../../chat/services/direct-chat.service";
import { ContactItem } from "../models/contact.model";
import { DirectRoomReadyEvent } from "../models/direct-room-ready.model";

@Injectable({
  providedIn: "root",
})
export class ContactChatService {
  private readonly directChatService = inject(DirectChatService);

  openDirectRoom(contact: ContactItem): Promise<DirectRoomReadyEvent> {
    return this.directChatService.getOrCreateDirectRoom(contact.id).then((roomId) => ({
      roomId,
      contact,
    }));
  }
}
