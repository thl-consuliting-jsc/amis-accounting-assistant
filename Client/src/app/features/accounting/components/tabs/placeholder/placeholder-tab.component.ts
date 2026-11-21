import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { phosphorInfo } from '@ng-icons/phosphor-icons/regular';

@Component({
  selector: 'app-placeholder-tab',
  standalone: true,
  imports: [CommonModule, NgIcon],
  templateUrl: './placeholder-tab.component.html',
  styleUrl: './placeholder-tab.component.scss'
})
export class PlaceholderTabComponent {
  public readonly module = input.required<string>();
  public readonly label = input.required<string>();

  protected readonly infoIcon = phosphorInfo;
}
