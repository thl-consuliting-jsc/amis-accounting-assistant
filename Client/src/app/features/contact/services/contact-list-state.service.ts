import { Injectable, inject, signal } from "@angular/core";
import { finalize } from "rxjs";
import { ContactItem } from "../models/contact.model";
import { ContactService } from "./contact.service";

@Injectable({
  providedIn: "root",
})
export class ContactListStateService {
  private readonly contactService = inject(ContactService);

  readonly contacts = signal<ContactItem[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal("");

  private hasLoadedContacts = false;

  loadContactsIfNeeded(): void {
    if (this.hasLoadedContacts) {
      return;
    }

    this.hasLoadedContacts = true;
    this.isLoading.set(true);
    this.errorMessage.set("");

    this.contactService
      .getContacts()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (contacts) => this.contacts.set(contacts),
        error: () => {
          this.hasLoadedContacts = false;
          this.contacts.set([]);
          this.errorMessage.set("Khong tai duoc danh sach lien he.");
        },
      });
  }

  filterContacts(contacts: ContactItem[], keyword: string): ContactItem[] {
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (!normalizedKeyword) {
      return contacts;
    }

    return contacts.filter((contact) => {
      return (
        contact.fullName.toLowerCase().includes(normalizedKeyword) ||
        contact.username.toLowerCase().includes(normalizedKeyword) ||
        contact.jobPosition.toLowerCase().includes(normalizedKeyword)
      );
    });
  }
}
