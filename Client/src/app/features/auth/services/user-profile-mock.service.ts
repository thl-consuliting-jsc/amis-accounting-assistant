import { Injectable } from "@angular/core";
import { MOCK_JOB_POSITIONS } from "../../../core/constants";
import {
  ConversationMessage,
  ConversationPreview,
} from "../../chat/models/conversation.model";
import { ProfileOpenRequest } from "../../chat/models/profile-open-request.model";
import { AuthUser } from "../models/auth-user.model";
import { UserProfile } from "../models/user-profile.model";

@Injectable({
  providedIn: "root",
})
export class UserProfileMockService {
  fromAuthUser(user: AuthUser): UserProfile {
    return this.buildProfile(`user-${user.id || user.username}`, {
      fullName: user.fullName?.trim() || user.username?.trim() || "AMATECH",
      username: user.username?.trim() || "amatech",
      jobPosition: user.jobPosition?.trim() || this.mockJobPosition(user.username || "amatech"),
      avatarUrl: user.avatarUrl?.trim() || "",
      phoneNumber: user.phoneNumber?.trim() || this.mockPhoneNumber(user.username || "amatech"),
      isSelf: true,
    });
  }

  resolve(request: ProfileOpenRequest): UserProfile {
    if (request.scope === "conversation") {
      return this.fromConversation(request.conversation);
    }

    return this.fromMessage(request.conversation, request.message);
  }

  fromConversation(conversation: ConversationPreview): UserProfile {
    if (conversation.type === "group") {
      const count = conversation.participantCount;
      const memberLabel = typeof count === "number" ? `${count} thành viên` : "Nhóm chat";

      return this.buildProfile(`room-${conversation.id}`, {
        fullName: conversation.name,
        username: this.inferUsername(conversation.name),
        jobPosition: `Nhóm · ${memberLabel}`,
        avatarUrl: conversation.avatarUrl?.trim() || "",
        phoneNumber: "—",
        isSelf: false,
      });
    }

    return this.buildProfile(`room-${conversation.id}`, {
      fullName: conversation.name,
      username: this.inferUsername(conversation.name),
      jobPosition: this.mockJobPosition(conversation.name),
      avatarUrl: conversation.avatarUrl?.trim() || "",
      phoneNumber: this.mockPhoneNumber(conversation.name),
      isSelf: false,
    });
  }

  fromMessage(conversation: ConversationPreview, message: ConversationMessage): UserProfile {
    const displayName = message.senderName?.trim() || conversation.name;

    return this.buildProfile(`sender-${conversation.id}-${displayName}`, {
      fullName: displayName,
      username: this.inferUsername(displayName),
      jobPosition: this.mockJobPosition(displayName),
      avatarUrl: message.senderAvatarUrl?.trim() || "",
      phoneNumber: this.mockPhoneNumber(displayName),
      isSelf: false,
    });
  }

  private buildProfile(
    key: string,
    values: Omit<UserProfile, "key">
  ): UserProfile {
    return {
      key,
      ...values,
    };
  }

  private inferUsername(displayName: string): string {
    const slug = displayName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");

    return slug || "amatech.user";
  }

  private mockJobPosition(seed: string): string {
    const index = this.hashSeed(seed) % MOCK_JOB_POSITIONS.length;
    return MOCK_JOB_POSITIONS[index];
  }

  private mockPhoneNumber(seed: string): string {
    const digits = String(100_000_000 + (this.hashSeed(seed) % 900_000_000)).slice(1);
    return `+84 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  private hashSeed(value: string): number {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash);
  }
}
