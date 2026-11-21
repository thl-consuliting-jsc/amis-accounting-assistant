import { booleanAttribute, Component, EventEmitter, Input, OnChanges, Output } from "@angular/core";
import { ModalCloseReason, ModalComponent } from "../modal";

export type MessageBoxVariant = "default" | "danger";

@Component({
  selector: "app-message-box",
  standalone: true,
  imports: [ModalComponent],
  templateUrl: "./message-box.component.html",
  styleUrl: "./message-box.component.scss",
})
export class MessageBoxComponent implements OnChanges {
  @Input({ transform: booleanAttribute }) open = false;
  @Input() title = "Xac nhan";
  @Input() message = "";
  @Input() confirmLabel = "Xac nhan";
  @Input() cancelLabel = "Huy";
  @Input({ transform: booleanAttribute }) showCancelButton = true;
  @Input() variant: MessageBoxVariant = "default";

  ngOnChanges(): void {
    // Nếu cancelLabel rỗng và showCancelButton chưa được override, tự ẩn nút
    if (!this.cancelLabel) {
      this.showCancelButton = false;
    }
  }

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  protected confirm(): void {
    this.confirmed.emit();
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected handleModalClosed(reason: ModalCloseReason): void {
    if (reason === "backdrop" || reason === "close-button" || reason === "escape") {
      this.cancel();
    }
  }
}
