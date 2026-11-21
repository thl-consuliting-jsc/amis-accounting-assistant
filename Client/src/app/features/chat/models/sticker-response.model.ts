export interface StickerPackResponse {
  id: number;
  name: string;
  thumbnailUrl: string;
  version: number;
  manifestUrl: string;
}

export interface StickerResponse {
  id: number;
  name: string;
  fileName: string;
  url: string;
}

export interface StickerPackDetailResponse {
  id: number;
  name: string;
  thumbnailUrl: string;
  version: number;
  stickers: StickerResponse[];
}
