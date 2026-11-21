import { booleanAttribute, Component, Input } from "@angular/core";

@Component({
  selector: "app-loading-button",
  standalone: true,
  templateUrl: "./loading-button.component.html",
  styleUrl: "./loading-button.component.scss",
})
export class LoadingButtonComponent {
  @Input({ transform: booleanAttribute }) loading = false;
  @Input({ transform: booleanAttribute }) disabled = false;
  @Input({ transform: booleanAttribute }) block = false;
  @Input() type: "button" | "submit" | "reset" = "button";
}
