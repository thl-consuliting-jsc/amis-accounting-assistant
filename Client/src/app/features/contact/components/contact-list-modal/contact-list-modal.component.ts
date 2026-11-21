import { CommonModule } from "@angular/common";
import { Component, computed, effect, inject, input, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorChatCircle,
  phosphorMagnifyingGlass,
  phosphorUserPlus,
} from "@ng-icons/phosphor-icons/regular";
import { ChatEntityId } from "../../../chat/models/conversation.model";
import { ModalComponent } from "../../../../shared/ui/modal";
import { formatInitials, trimAssetUrl } from "../../../../shared/utils/display.util";
import { DirectRoomReadyEvent } from "../../models/direct-room-ready.model";
import { ContactItem } from "../../models/contact.model";
import { ContactChatService } from "../../services/contact-chat.service";
import { ContactListStateService } from "../../services/contact-list-state.service";

@Component({
  selector: "app-contact-list-modal",
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, ModalComponent],
  templateUrl: "./contact-list-modal.component.html",
  styleUrl: "./contact-list-modal.component.scss",
})
export class ContactListModalComponent {
  private readonly contactListState = inject(ContactListStateService);
  private readonly contactChatService = inject(ContactChatService);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly contactSelected = output<ContactItem>();
  readonly directRoomReady = output<DirectRoomReadyEvent>();

  protected readonly searchIcon = phosphorMagnifyingGlass;
  protected readonly messageIcon = phosphorChatCircle;
  protected readonly addUserIcon = phosphorUserPlus;
  protected readonly searchTerm = signal("");
  protected readonly openingRoomContactId = signal<ChatEntityId | null>(null);
  protected readonly localErrorMessage = signal("");

  protected readonly contacts = this.contactListState.contacts;
  protected readonly isLoading = this.contactListState.isLoading;
  protected readonly loadErrorMessage = this.contactListState.errorMessage;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.contactListState.loadContactsIfNeeded();
      }
    });
  }

  protected readonly filteredContacts = computed(() =>
    this.contactListState.filterContacts(this.contacts(), this.searchTerm())
  );

  protected readonly errorMessage = computed(
    () => this.localErrorMessage() || this.loadErrorMessage()
  );

  protected close(): void {
    this.closed.emit();
  }

  protected selectContact(contact: ContactItem): void {
    if (this.openingRoomContactId()) {
      return;
    }

    this.openingRoomContactId.set(contact.id);
    this.localErrorMessage.set("");

    this.contactChatService
      .openDirectRoom(contact)
      .then((event) => {
        this.contactSelected.emit(contact);
        this.directRoomReady.emit(event);
        this.close();
      })
      .catch(() => {
        this.localErrorMessage.set("Khong the mo phong chat voi lien he nay.");
      })
      .finally(() => {
        this.openingRoomContactId.set(null);
      });
  }

  protected initials(contact: ContactItem): string {
    return formatInitials(contact.fullName);
  }

  protected avatarUrl(contact: ContactItem): string {
    return trimAssetUrl(contact.avatarUrl);
  }
}
