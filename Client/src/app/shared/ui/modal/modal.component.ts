import { booleanAttribute, Component, EventEmitter, HostListener, Input, Output } from "@angular/core";
import { NgIcon } from "@ng-icons/core";
import { phosphorX } from "@ng-icons/phosphor-icons/regular";

export type ModalCloseReason = "backdrop" | "close-button" | "escape";
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
export type ModalBodyOverflow = "auto" | "hidden" | "visible";
export type ModalPosition = "top" | "center" | "bottom";

@Component({
  selector: "app-modal",
  standalone: true,
  imports: [NgIcon],
  templateUrl: "./modal.component.html",
  styleUrl: "./modal.component.scss",
})
export class ModalComponent {
  @Input({ transform: booleanAttribute }) open = false;
  @Input({ transform: booleanAttribute }) closeOnBackdrop = true;
  @Input({ transform: booleanAttribute }) closeOnEscape = true;
  @Input({ transform: booleanAttribute }) showCloseButton = true;
  @Input() title = "";
  @Input() subtitle = "";
  @Input() size: ModalSize = "md";
  @Input() position: ModalPosition = "center";
  @Input() bodyHeight = "";
  @Input() bodyMinHeight = "";
  @Input() bodyMaxHeight = "";
  @Input() bodyOverflow: ModalBodyOverflow = "auto";
  @Input() labelledById = "modal-title";
  @Input() describedById = "modal-description";

  @Output() closed = new EventEmitter<ModalCloseReason>();

  protected readonly closeIcon = phosphorX;

  @HostListener("document:keydown.escape", ["$event"])
  protected handleEscape(event: Event): void {
    if (!this.open || !this.closeOnEscape) {
      return;
    }

    event.preventDefault();
    this.requestClose("escape");
  }

  protected requestClose(reason: ModalCloseReason): void {
    this.closed.emit(reason);
  }

  protected handleBackdropClick(): void {
    if (!this.closeOnBackdrop) {
      return;
    }

    this.requestClose("backdrop");
  }
}
