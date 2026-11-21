import {
  Directive,
  effect,
  inject,
  Input,
  TemplateRef,
  ViewContainerRef,
} from "@angular/core";
import { AuthService } from "../../features/auth/services/auth.service";

/**
 * Structural directive kiểm tra role của user hiện tại.
 *
 * Sử dụng:
 *   *appHasRole="'Admin'"
 *   *appHasRole="['Admin', 'Mod']"
 *   *appHasRole="'Admin'; mode: 'all'"
 *   *appHasRole="'Admin'; else noAccess"
 *
 * Ví dụ với else:
 *   <ng-container *appHasRole="'Admin'; else denied">
 *     <app-admin-page />
 *   </ng-container>
 *   <ng-template #denied><app-access-denied /></ng-template>
 */
@Directive({
  selector: "[appHasRole]",
  standalone: true,
})
export class HasRoleDirective {
  private readonly authService = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  private _roles: string[] = [];
  private _mode: "any" | "all" = "any";
  private _elseTemplate: TemplateRef<unknown> | null = null;

  /**
   * Một role đơn hoặc danh sách các role cần kiểm tra.
   */
  @Input()
  set appHasRole(value: string | string[]) {
    this._roles = this.normalize(value);
    this.update();
  }

  /**
   * Chế độ kiểm tra:
   * - `"any"` (mặc định): user có ít nhất 1 role trong danh sách.
   * - `"all"`: user phải có đủ tất cả các role.
   */
  @Input()
  set appHasRoleMode(value: "any" | "all") {
    this._mode = value ?? "any";
    this.update();
  }

  /**
   * Template hiển thị khi user KHÔNG có role yêu cầu.
   * Dùng microsyntax: *appHasRole="'Admin'; else noAccess"
   */
  @Input()
  set appHasRoleElse(template: TemplateRef<unknown> | null) {
    this._elseTemplate = template;
    this.update();
  }

  constructor() {
    // Phản ứng với thay đổi currentUser (login / restore session / logout)
    effect(() => {
      // Đọc signal để effect subscribe vào nó
      void this.authService.currentUser();
      this.update();
    });
  }

  private update(): void {
    const userRoles = this.authService.currentUser()?.roles ?? [];
    const hasAccess = this.checkAccess(userRoles, this._roles, this._mode);

    this.viewContainer.clear();

    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else if (this._elseTemplate) {
      this.viewContainer.createEmbeddedView(this._elseTemplate);
    }
  }

  private normalize(value: string | string[]): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private checkAccess(userRoles: string[], required: string[], mode: "any" | "all"): boolean {
    if (required.length === 0) return true;
    if (mode === "all") {
      return required.every((r) => userRoles.includes(r));
    }
    return required.some((r) => userRoles.includes(r));
  }
}
