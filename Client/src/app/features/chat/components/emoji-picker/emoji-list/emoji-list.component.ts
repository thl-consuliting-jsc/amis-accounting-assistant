import { Component, computed, inject, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import { phosphorClockCounterClockwise, phosphorSmiley } from "@ng-icons/phosphor-icons/regular";
import faceEmojiMap from "../../../../../../assets/emoji/face/map.json";
import { RECENT_EMOJI_LIMIT } from "../../../../../core/constants";
import { EmojiRecentService } from "../../../services/emoji-recent.service";

interface FaceEmoji {
  id: string;
  file: string;
  ascii: string[];
  shortcode: string;
}

@Component({
  selector: "app-emoji-list",
  standalone: true,
  imports: [NgIcon],
  templateUrl: "./emoji-list.component.html",
  styleUrl: "./emoji-list.component.scss",
})
export class EmojiListComponent {
  private readonly emojiRecentService = inject(EmojiRecentService);

  readonly emojiSelected = output<string>();

  protected readonly emojis = faceEmojiMap as FaceEmoji[];
  protected readonly recentEmojiUsage = signal(this.emojiRecentService.loadRecentUsage());
  protected readonly recentEmojis = computed(() => {
    const emojiById = new Map(this.emojis.map((emoji) => [emoji.id, emoji]));

    return this.recentEmojiUsage()
      .map((usage) => emojiById.get(usage.id))
      .filter((emoji): emoji is FaceEmoji => Boolean(emoji))
      .slice(0, RECENT_EMOJI_LIMIT);
  });

  protected readonly smileIcon = phosphorSmiley;
  protected readonly recentIcon = phosphorClockCounterClockwise;

  protected selectEmoji(emoji: FaceEmoji): void {
    const token = emoji.shortcode;

    if (token) {
      this.recentEmojiUsage.set(
        this.emojiRecentService.trackRecentUsage(this.recentEmojiUsage(), emoji.id)
      );
      this.emojiSelected.emit(token);
    }
  }
}
