import { DOCUMENT } from "@angular/common";
import { Injectable, inject, signal } from "@angular/core";
import { THEME_STORAGE_KEY } from "../constants";

@Injectable({
  providedIn: "root",
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly isDarkMode = signal(this.resolveInitialDarkMode());

  toggleTheme(): void {
    const nextMode = !this.isDarkMode();
    this.applyTheme(nextMode);
  }

  private resolveInitialDarkMode(): boolean {
    const storedTheme = this.readStoredTheme();

    if (storedTheme) {
      this.document.documentElement.dataset["theme"] = storedTheme;
      return storedTheme === "dark";
    }

    const prefersDark =
      this.document.defaultView?.matchMedia("(prefers-color-scheme: dark)").matches ?? false;

    this.document.documentElement.dataset["theme"] = prefersDark ? "dark" : "light";

    return prefersDark;
  }

  private applyTheme(isDarkMode: boolean): void {
    this.isDarkMode.set(isDarkMode);
    this.document.documentElement.dataset["theme"] = isDarkMode ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light");
  }

  private readStoredTheme(): "dark" | "light" | null {
    if (typeof localStorage === "undefined") {
      return null;
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : null;
  }
}
