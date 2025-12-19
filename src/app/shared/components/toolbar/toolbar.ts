import { Component, computed, effect, inject, signal } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';

import { ThemeService } from '../../../core/state/theme.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GoogleLoginDialogComponent } from '../google-login-dialog/google-login-dialog';

type PizzaCategory = 'simple' | 'special';

@Component({
  selector: 'app-toolbar',
  imports: [ToolbarModule, ButtonModule, SelectButtonModule, FormsModule, GoogleLoginDialogComponent],
  standalone: true,
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthStore);

  readonly mode = this.theme.mode;
  readonly themeIcon = computed(() => (this.mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly displayName = this.auth.displayName;
  readonly photoUrl = this.auth.photoUrl;

  // ✅ Fallback si la imagen falla (URL vacía, 404, etc.)
  readonly avatarBroken = signal(false);

  constructor() {
    effect(
      () => {
        // Cuando cambie la URL, reintenta mostrar imagen
        this.photoUrl();
        this.avatarBroken.set(false);
      },
      { allowSignalWrites: true }
    );
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  // Mobile select
  pizzaCategory: PizzaCategory = 'simple';
  readonly pizzaCategoryOptions = [
    { label: 'Sencillas', value: 'simple', icon: 'pi pi-star' },
    { label: 'Especiales', value: 'special', icon: 'pi pi-bolt' },
  ];

  onCategoryChange(value: PizzaCategory) {
    this.pizzaCategory = value;
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
  }
}
