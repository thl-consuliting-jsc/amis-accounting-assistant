import { Component, inject } from "@angular/core";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-new-user-blocked-page",
  standalone: true,
  imports: [],
  templateUrl: "./new-user-blocked-page.component.html",
  styleUrl: "./new-user-blocked-page.component.scss",
})
export class NewUserBlockedPageComponent {
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
