import { Pipe, PipeTransform } from "@angular/core";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";
import faceEmojiMap from "../../../../assets/emoji/face/map.json";

interface FaceEmoji {
  id: string;
  file: string;
  ascii: string[];
  shortcode: string;
}

interface EmojiToken {
  token: string;
  emoji: FaceEmoji;
}

const faceEmojis = faceEmojiMap as FaceEmoji[];
const emojiTokens = createEmojiTokens(faceEmojis);
const emojiTokenMap = new Map(emojiTokens.map(({ token, emoji }) => [token, emoji]));
const emojiRegex = new RegExp(emojiTokens.map(({ token }) => escapeRegExp(token)).join("|"), "g");

@Pipe({
  name: "emojiHtml",
  standalone: true,
})
export class EmojiHtmlPipe implements PipeTransform {
  constructor(private readonly sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return "";
    }

    const escapedValue = escapeHtml(value);
    const html = escapedValue.replace(emojiRegex, (token) => {
      const emoji = emojiTokenMap.get(token);

      if (!emoji) {
        return token;
      }

      const shortcode = escapeHtmlAttribute(emoji.shortcode);
      const src = `assets/emoji/face/${encodeURIComponent(emoji.file)}`;

      return `<img class="message-emoji" src="${src}" alt="${shortcode}" title="${shortcode}" loading="lazy">`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

function createEmojiTokens(emojis: FaceEmoji[]): EmojiToken[] {
  const tokenMap = new Map<string, FaceEmoji>();

  for (const emoji of emojis) {
    for (const token of [emoji.shortcode, ...emoji.ascii]) {
      const normalizedToken = token.trim();

      if (normalizedToken) {
        tokenMap.set(escapeHtml(normalizedToken), emoji);
      }
    }
  }

  return Array.from(tokenMap, ([token, emoji]) => ({ token, emoji })).sort(
    (a, b) => b.token.length - a.token.length
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
