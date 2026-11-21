import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { invoke } from "@tauri-apps/api/core";
import { Observable, firstValueFrom, map } from "rxjs";
import {
  API_ASSET_BASE_URL,
  API_ENDPOINTS,
  STICKER_PACK_VERSION_STORAGE_PREFIX,
} from "../../../core/constants";
import { Api } from "../../../core/models/api.model";
import {
  StickerPackDetailResponse,
  StickerPackResponse,
  StickerResponse,
} from "../models/sticker-response.model";
import {
  InstallStickerPackResult,
  StickerPack,
  StickerPackDetail,
} from "../models/sticker.model";
import { AssetUrlService } from "../../../core/services/asset-url.service";

@Injectable({
  providedIn: "root",
})
export class StickerService {
  private readonly http = inject(HttpClient);
  private readonly assetUrlService = inject(AssetUrlService);

  getStickerPacks(): Observable<StickerPack[]> {
    return this.http.get<Api<StickerPackResponse[]>>(API_ENDPOINTS.stickerPacks).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || "Khong the tai danh sach sticker");
        }

        return (response.data ?? []).map((pack) => ({
          id: pack.id,
          name: pack.name,
          thumbnailUrl: this.toStickerAssetUrl(pack.thumbnailUrl),
          version: pack.version,
          manifestUrl: this.toStickerAssetUrl(pack.manifestUrl),
        }));
      })
    );
  }

  getStickerPackPreview(packId: number): Observable<StickerPackDetail> {
    return this.http
      .get<Api<StickerPackDetailResponse>>(`${API_ENDPOINTS.stickerPacks}/${packId}/preview`)
      .pipe(
        map((response) => {
          if (!response.success || !response.data) {
            throw new Error(response.message || "Khong the tai preview sticker");
          }

          const detail = response.data;

          return {
            id: detail.id,
            name: detail.name,
            thumbnailUrl: this.toStickerAssetUrl(detail.thumbnailUrl),
            version: detail.version,
            stickers: (detail.stickers ?? []).map((sticker) => ({
              id: sticker.id,
              name: sticker.name,
              fileName: sticker.fileName,
              url: this.toStickerAssetUrl(sticker.url),
            })),
          };
        })
      );
  }

  getAllStickerPacksWithStickers(): Observable<StickerPackDetail[]> {
    return this.http.get<Api<StickerPackDetailResponse[]>>(`${API_ENDPOINTS.stickerPacks}/all`).pipe(
      map((response) => {
        if (!response.success) {
          throw new Error(response.message || "Khong the tai danh sach sticker da tai");
        }

        return (response.data ?? []).map((pack) => ({
          id: pack.id,
          name: pack.name,
          thumbnailUrl: this.toStickerAssetUrl(pack.thumbnailUrl),
          version: pack.version,
          stickers: (pack.stickers ?? []).map((sticker) => ({
            id: sticker.id,
            name: sticker.name,
            fileName: sticker.fileName,
            url: this.toStickerAssetUrl(sticker.url),
          })),
        }));
      })
    );
  }

  async downloadAndInstallStickerPack(pack: StickerPackDetail): Promise<InstallStickerPackResult> {
    const manifestJson = await firstValueFrom(
      this.http.get(`${API_ENDPOINTS.stickerPacks}/${pack.id}/manifest`, { responseType: "text" })
    );
    const zipBuffer = await firstValueFrom(
      this.http.get(`${API_ENDPOINTS.stickerPacks}/${pack.id}/download`, { responseType: "arraybuffer" })
    );

    if (!manifestJson || !zipBuffer) {
      throw new Error("Khong the tai du lieu sticker pack");
    }

    const result = await invoke<InstallStickerPackResult>("install_sticker_pack", {
      packId: pack.id,
      manifestJson,
      zipBytes: Array.from(new Uint8Array(zipBuffer)),
    });

    this.saveDownloadedPackVersion(pack.id, pack.version);

    return result;
  }

  isStickerPackDownloaded(pack: StickerPackDetail): boolean {
    if (typeof localStorage === "undefined") {
      return false;
    }

    return localStorage.getItem(this.versionStorageKey(pack.id)) === String(pack.version);
  }

  toStickerAssetUrl(url: string): string {
    return this.assetUrlService.resolve(url, API_ASSET_BASE_URL) ?? "";
  }

  private saveDownloadedPackVersion(packId: number, version: number): void {
    if (typeof localStorage === "undefined") {
      return;
    }

    localStorage.setItem(this.versionStorageKey(packId), String(version));
  }

  private versionStorageKey(packId: number): string {
    return `${STICKER_PACK_VERSION_STORAGE_PREFIX}:${packId}`;
  }
}
