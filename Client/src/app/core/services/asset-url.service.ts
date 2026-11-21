import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class AssetUrlService {
  resolve(url: string | null | undefined, baseUrl: string): string | null {
    const normalizedUrl = url?.trim();

    if (!normalizedUrl) {
      return null;
    }

    if (/^https?:\/\//i.test(normalizedUrl)) {
      return normalizedUrl;
    }

    return `${baseUrl}${normalizedUrl.startsWith("/") ? "" : "/"}${normalizedUrl}`;
  }
}
