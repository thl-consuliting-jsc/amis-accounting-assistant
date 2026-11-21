import { Component, output } from "@angular/core";
import { EmojiHtmlPipe } from "../../../../shared/pipes";

@Component({
  selector: "app-message-reaction-picker",
  standalone: true,
  imports: [EmojiHtmlPipe],
  templateUrl: "./message-reaction-picker.component.html",
  styleUrl: "./message-reaction-picker.component.scss",
})
export class MessageReactionPickerComponent {
  readonly emojiSelected = output<string>();

  protected readonly quickReactions = [
    ":love:",
    ":rofl:",
    ":surprised:",
    ":cry:",
    ":furious:",
    ":cat:"
  ];
}
