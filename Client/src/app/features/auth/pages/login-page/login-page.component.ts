import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Output, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorEye,
  phosphorEyeSlash,
  phosphorLockKey,
  phosphorMonitor,
  phosphorShieldCheck,
  phosphorSignIn,
  phosphorUserCircle,
} from "@ng-icons/phosphor-icons/regular";
import { finalize } from "rxjs";
import { AuthService } from "../../services/auth.service";
import { LoadingButtonComponent } from "../../../../shared/ui/loading-button/loading-button.component";

export interface LoginPayload {
  username: string;
  rememberDevice: boolean;
}

@Component({
  selector: "app-login-page",
  imports: [CommonModule, FormsModule, NgIcon, LoadingButtonComponent],
  standalone: true,
  templateUrl: "./login-page.component.html",
  styleUrl: "./login-page.component.scss",
})
export class LoginPageComponent {
  @Output() loginSuccess = new EventEmitter<LoginPayload>();
  @Output() goToRegister = new EventEmitter<void>();

  private readonly authService = inject(AuthService);

  protected readonly username = signal("");
  protected readonly password = signal("");
  protected readonly rememberDevice = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal("");
  protected readonly showPassword = signal(false);
  protected readonly activeField = signal<"username" | "password" | null>(null);
  protected readonly touched = signal(false);
  protected readonly userIcon = phosphorUserCircle;
  protected readonly lockIcon = phosphorLockKey;
  protected readonly loginIcon = phosphorSignIn;
  protected readonly monitorIcon = phosphorMonitor;
  protected readonly shieldIcon = phosphorShieldCheck;
  protected readonly passwordIcon = computed(() => (this.showPassword() ? phosphorEyeSlash : phosphorEye));

  protected readonly canSubmit = computed(() => {
    return this.username().trim().length > 0 && this.password().trim().length > 0;
  });

  protected readonly hasError = computed(() => this.errorMessage().length > 0);

  protected readonly initials = computed(() => {
    const value = this.username().trim() || "AM";
    return value
      .split(/[.@_\-\s]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  });

  protected submit(): void {
    this.touched.set(true);

    if (!this.canSubmit() || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");

    this.authService
      .login({
        username: this.username().trim(),
        password: this.password(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.loginSuccess.emit({
            username: this.username().trim(),
            rememberDevice: this.rememberDevice(),
          });
        },
        error: () => {
          this.errorMessage.set("Đăng nhập không thành công.");
        },
      });
  }
}
