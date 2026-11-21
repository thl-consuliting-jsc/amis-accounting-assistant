import { Component, inject, output, signal } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorDownloadSimple,
  phosphorStorefront,
  phosphorX,
} from "@ng-icons/phosphor-icons/regular";
import { Sticker, StickerPack, StickerPackDetail } from "../../../models/sticker.model";
import { StickerService } from "../../../services/sticker.service";

type StickerTab = "downloaded" | "library";

@Component({
  selector: "app-sticker-panel",
  standalone: true,
  imports: [NgIcon],
  templateUrl: "./sticker-panel.component.html",
  styleUrl: "./sticker-panel.component.scss",
})
export class StickerPanelComponent {
  private readonly stickerService = inject(StickerService);

  readonly stickerSelected = output<Sticker>();

  protected readonly activeStickerTab = signal<StickerTab>("downloaded");
  protected readonly downloadedStickerPacks = signal<StickerPackDetail[]>([]);
  protected readonly downloadedStickerPacksLoading = signal(false);
  protected readonly downloadedStickerPacksError = signal<string | null>(null);
  protected readonly stickerPacks = signal<StickerPack[]>([]);
  protected readonly stickerPacksLoading = signal(false);
  protected readonly stickerPacksError = signal<string | null>(null);
  protected readonly selectedStickerPack = signal<StickerPackDetail | null>(null);
  protected readonly previewLoading = signal(false);
  protected readonly previewError = signal<string | null>(null);
  protected readonly downloadingPackId = signal<number | null>(null);
  protected readonly downloadError = signal<string | null>(null);

  protected readonly downloadedIcon = phosphorDownloadSimple;
  protected readonly storeIcon = phosphorStorefront;
  protected readonly closeIcon = phosphorX;

  constructor() {
    this.loadDownloadedStickerPacks();
  }

  protected selectStickerTab(tab: StickerTab): void {
    this.activeStickerTab.set(tab);

    if (tab === "downloaded") {
      this.loadDownloadedStickerPacks();
    }

    if (tab === "library") {
      this.loadStickerPacks();
    }
  }

  protected loadDownloadedStickerPacks(): void {
    if (this.downloadedStickerPacksLoading() || this.downloadedStickerPacks().length > 0) {
      return;
    }

    this.downloadedStickerPacksLoading.set(true);
    this.downloadedStickerPacksError.set(null);

    this.stickerService.getAllStickerPacksWithStickers().subscribe({
      next: (packs) => {
        this.downloadedStickerPacks.set(packs);
      },
      error: (error: Error) => {
        this.downloadedStickerPacksError.set(error.message || "Khong the tai sticker da tai");
        this.downloadedStickerPacksLoading.set(false);
      },
      complete: () => {
        this.downloadedStickerPacksLoading.set(false);
      },
    });
  }

  protected loadStickerPacks(): void {
    if (this.stickerPacksLoading() || this.stickerPacks().length > 0) {
      return;
    }

    this.stickerPacksLoading.set(true);
    this.stickerPacksError.set(null);

    this.stickerService.getStickerPacks().subscribe({
      next: (packs) => {
        this.stickerPacks.set(packs);
      },
      error: (error: Error) => {
        this.stickerPacksError.set(error.message || "Khong the tai danh sach sticker");
        this.stickerPacksLoading.set(false);
      },
      complete: () => {
        this.stickerPacksLoading.set(false);
      },
    });
  }

  protected openStickerPreview(pack: StickerPack): void {
    this.selectedStickerPack.set(null);
    this.previewLoading.set(true);
    this.previewError.set(null);

    this.stickerService.getStickerPackPreview(pack.id).subscribe({
      next: (detail) => {
        this.selectedStickerPack.set(detail);
      },
      error: (error: Error) => {
        this.previewError.set(error.message || "Khong the tai preview sticker");
      },
      complete: () => {
        this.previewLoading.set(false);
      },
    });
  }

  protected closeStickerPreview(): void {
    this.selectedStickerPack.set(null);
    this.previewError.set(null);
    this.previewLoading.set(false);
    this.downloadError.set(null);
  }

  protected selectSticker(sticker: Sticker): void {
    this.stickerSelected.emit(sticker);
  }

  protected async downloadSelectedStickerPack(): Promise<void> {
    const pack = this.selectedStickerPack();

    if (!pack || this.downloadingPackId() !== null) {
      return;
    }

    this.downloadingPackId.set(pack.id);
    this.downloadError.set(null);

    try {
      await this.stickerService.downloadAndInstallStickerPack(pack);
    } catch {
      this.downloadError.set("Khong the tai sticker pack");
    } finally {
      this.downloadingPackId.set(null);
    }
  }

  protected isStickerPackDownloaded(pack: StickerPackDetail): boolean {
    return this.stickerService.isStickerPackDownloaded(pack);
  }

  protected downloadButtonText(pack: StickerPackDetail): string {
    if (this.downloadingPackId() === pack.id) {
      return "Dang tai...";
    }

    return this.isStickerPackDownloaded(pack) ? "Da tai" : "Tai xuong";
  }
}
