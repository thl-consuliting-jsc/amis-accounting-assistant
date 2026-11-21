export interface StickerPack {
  id: number;
  name: string;
  thumbnailUrl: string;
  version: number;
  manifestUrl: string;
}

export interface Sticker {
  id: number;
  name: string;
  fileName: string;
  url: string;
}

export interface StickerPackDetail {
  id: number;
  name: string;
  thumbnailUrl: string;
  version: number;
  stickers: Sticker[];
}

export interface InstallStickerPackResult {
  packDir: string;
  fileCount: number;
}
