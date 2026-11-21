import { Injectable } from "@angular/core";
import {
  RECENT_EMOJI_STORAGE_KEY,
  RECENT_EMOJI_STORAGE_LIMIT,
} from "../../../core/constants";

export interface RecentEmojiUsage {
  id: string;
  count: number;
  lastUsedAt: number;
}

@Injectable({
  providedIn: "root",
})
export class EmojiRecentService {
  loadRecentUsage(): RecentEmojiUsage[] {
    if (typeof localStorage === "undefined") {
      return [];
    }

    try {
      const storedValue = localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);

      if (!storedValue) {
        return [];
      }

      const parsedValue = JSON.parse(storedValue);

      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue
        .filter(
          (usage): usage is RecentEmojiUsage =>
            typeof usage?.id === "string"
            && Number.isFinite(usage?.count)
            && Number.isFinite(usage?.lastUsedAt)
        )
        .sort((current, next) => next.count - current.count || next.lastUsedAt - current.lastUsedAt)
        .slice(0, RECENT_EMOJI_STORAGE_LIMIT);
    } catch {
      return [];
    }
  }

  trackRecentUsage(currentUsage: RecentEmojiUsage[], emojiId: string): RecentEmojiUsage[] {
    const now = Date.now();
    const nextUsage = currentUsage
      .filter((usage) => usage.id !== emojiId)
      .concat({
        id: emojiId,
        count: (currentUsage.find((usage) => usage.id === emojiId)?.count ?? 0) + 1,
        lastUsedAt: now,
      })
      .sort((current, next) => next.count - current.count || next.lastUsedAt - current.lastUsedAt)
      .slice(0, RECENT_EMOJI_STORAGE_LIMIT);

    this.saveRecentUsage(nextUsage);

    return nextUsage;
  }

  private saveRecentUsage(usage: RecentEmojiUsage[]): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(usage));
    } catch {
      // Recent emoji history is a convenience feature, so storage failures are ignored.
    }
  }
}
