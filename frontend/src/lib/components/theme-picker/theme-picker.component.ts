import { Component, effect, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-theme-picker',
  imports: [MatButtonToggleModule, FormsModule, MatIconModule],
  templateUrl: './theme-picker.component.html',
  styleUrl: './theme-picker.component.scss',
  standalone: true,
})
export class ThemePickerComponent {
  readonly value = signal(window.localStorage.getItem('theme') ?? 'light dark');

  private readonly body = document.querySelector('body')!;

  _ = effect(() => {
    this.body.style.colorScheme = this.value();
    window.localStorage.setItem('theme', this.value());
  });
}
