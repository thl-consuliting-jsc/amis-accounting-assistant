import { CommonModule } from "@angular/common";
import { Component, computed, EventEmitter, inject, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgIcon } from "@ng-icons/core";
import {
  phosphorEnvelope,
  phosphorEye,
  phosphorEyeSlash,
  phosphorLockKey,
  phosphorPhone,
  phosphorShieldCheck,
  phosphorUser,
  phosphorUserCircle,
  phosphorUserPlus,
} from "@ng-icons/phosphor-icons/regular";
import { finalize } from "rxjs";
import { REGISTER_SUCCESS_REDIRECT_DELAY_MS } from "../../../../core/constants";
import { RegisterService } from "../../services/register.service";
import { LoadingButtonComponent } from "../../../../shared/ui/loading-button/loading-button.component";

@Component({
  selector: "app-register-page",
  imports: [CommonModule, FormsModule, NgIcon, LoadingButtonComponent],
  standalone: true,
  templateUrl: "./register-page.component.html",
  styleUrl: "./register-page.component.scss",
})
export class RegisterPageComponent {
  @Output() goToLogin = new EventEmitter<void>();

  private readonly registerService = inject(RegisterService);

  protected readonly fullName = signal("");
  protected readonly username = signal("");
  protected readonly email = signal("");
  protected readonly phoneNumber = signal("");
  protected readonly jobPositionId = signal("");
  protected readonly password = signal("");
  protected readonly confirmPassword = signal("");
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal("");
  protected readonly successMessage = signal("");
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);
  protected readonly activeField = signal<string | null>(null);
  protected readonly touched = signal(false);

  protected readonly userIcon = phosphorUserCircle;
  protected readonly userAltIcon = phosphorUser;
  protected readonly lockIcon = phosphorLockKey;
  protected readonly emailIcon = phosphorEnvelope;
  protected readonly phoneIcon = phosphorPhone;
  protected readonly registerIcon = phosphorUserPlus;
  protected readonly shieldIcon = phosphorShieldCheck;
  protected readonly passwordIcon = computed(() =>
    this.showPassword() ? phosphorEyeSlash : phosphorEye
  );
  protected readonly confirmPasswordIcon = computed(() =>
    this.showConfirmPassword() ? phosphorEyeSlash : phosphorEye
  );

  protected readonly canSubmit = computed(
    () =>
      this.fullName().trim().length > 0 &&
      this.username().trim().length > 0 &&
      this.email().trim().length > 0 &&
      this.password().trim().length > 0 &&
      this.confirmPassword().trim().length > 0
  );

  protected readonly hasError = computed(() => this.errorMessage().length > 0);
  protected readonly hasSuccess = computed(() => this.successMessage().length > 0);

  protected readonly passwordMismatch = computed(
    () =>
      this.touched() &&
      this.confirmPassword().length > 0 &&
      this.password() !== this.confirmPassword()
  );

  protected submit(): void {
    this.touched.set(true);

    if (!this.canSubmit() || this.isSubmitting()) {
      return;
    }

    if (this.password() !== this.confirmPassword()) {
      this.errorMessage.set("Mật khẩu xác nhận không khớp.");
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set("");
    this.successMessage.set("");

    this.registerService
      .register({
        fullName: this.fullName().trim(),
        username: this.username().trim(),
        email: this.email().trim(),
        phoneNumber: this.phoneNumber().trim(),
        jobPositionId: this.jobPositionId().trim(),
        password: this.password(),
        confirmPassword: this.confirmPassword(),
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            response.message || "Đăng ký thành công! Đang chuyển đến trang đăng nhập..."
          );
          setTimeout(() => this.goToLogin.emit(), REGISTER_SUCCESS_REDIRECT_DELAY_MS);
        },
        error: () => {
          this.errorMessage.set("Đăng ký không thành công. Vui lòng thử lại.");
        },
      });
  }
}
