import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { Api } from "../../../core/models/api.model";
import { API_ENDPOINTS } from "../../../core/constants";
import { ContactItem } from "../models/contact.model";
import { ContactResponseItem } from "../models/contact-response.model";

@Injectable({
  providedIn: "root",
})
export class ContactService {
  private readonly http = inject(HttpClient);

  getContacts(): Observable<ContactItem[]> {
    return this.http.get<Api<ContactResponseItem[]>>(API_ENDPOINTS.contact).pipe(
      map((response) =>
        response.data.map((contact) => ({
          id: contact.id,
          username: contact.username,
          fullName: contact.fullName,
          jobPosition: contact.jobPosition,
          avatarUrl: contact.avatarUrl,
          status: contact.status,
          online: contact.status === 1,
        }))
      )
    );
  }
}
