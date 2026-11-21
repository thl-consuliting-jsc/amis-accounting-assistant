import { Component, computed, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import { phosphorSmiley, phosphorSticker } from "@ng-icons/phosphor-icons/regular";
import faceEmojiMap from "../../../../../assets/emoji/face/map.json";
import { Sticker } from "../../models/sticker.model";
import { EmojiListComponent } from "./emoji-list";
import { StickerPanelComponent } from "./sticker-panel";

type EmojiPickerTab = "emoji" | "sticker";

@Component({
  selector: "app-emoji-picker",
  standalone: true,
  imports: [EmojiListComponent, NgIcon, StickerPanelComponent],
  templateUrl: "./emoji-picker.component.html",
  styleUrl: "./emoji-picker.component.scss",
})
export class EmojiPickerComponent {
  readonly emojiSelected = output<string>();
  readonly stickerSelected = output<Sticker>();

  protected readonly activeTab = signal<EmojiPickerTab>("emoji");
  protected readonly emojiCount = computed(() => faceEmojiMap.length);

  protected readonly smileIcon = phosphorSmiley;
  protected readonly stickerIcon = phosphorSticker;

  protected emitEmoji(token: string): void {
    this.emojiSelected.emit(token);
  }

  protected emitSticker(sticker: Sticker): void {
    this.stickerSelected.emit(sticker);
  }

  protected selectTab(tab: EmojiPickerTab): void {
    this.activeTab.set(tab);
  }
}
