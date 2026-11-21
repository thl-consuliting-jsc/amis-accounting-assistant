import { Injectable, inject } from "@angular/core";
import { ChatEntityId } from "../models/conversation.model";
import { ChatSignalrService } from "./chat-signalr.service";

@Injectable({
  providedIn: "root",
})
export class DirectChatService {
  private readonly chatSignalrService = inject(ChatSignalrService);

  getOrCreateDirectRoom(otherUserId: ChatEntityId): Promise<ChatEntityId> {
    return this.chatSignalrService.getOrCreateDirectRoom(otherUserId);
  }
}
