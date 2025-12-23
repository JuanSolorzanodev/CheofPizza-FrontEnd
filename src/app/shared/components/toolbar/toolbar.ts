// src/app/shared/components/toolbar/toolbar.ts
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';

import { ThemeService } from '../../../core/state/theme.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GoogleLoginDialogComponent } from '../google-login-dialog/google-login-dialog';
import { ScrollService } from '../../ui/scroll.service';

type PizzaCategory = 'simple' | 'special';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [ToolbarModule, ButtonModule, SelectButtonModule, FormsModule, GoogleLoginDialogComponent],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  private readonly scroll = inject(ScrollService);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthStore);

  // Ajusta según tu toolbar real (sticky/fixed)
  private readonly headerOffset = 90;

  readonly mode = this.theme.mode;
  readonly themeIcon = computed(() => (this.mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly displayName = this.auth.displayName;
  readonly photoUrl = this.auth.photoUrl;

  readonly avatarBroken = signal(false);

  // Mobile select
  pizzaCategory: PizzaCategory = 'simple';
  readonly pizzaCategoryOptions = [
    { label: 'Sencillas', value: 'simple', icon: 'pi pi-star' },
    { label: 'Especiales', value: 'special', icon: 'pi pi-bolt' },
  ];

  constructor() {
    effect(
      () => {
        this.photoUrl();
        this.avatarBroken.set(false);
      },
      { allowSignalWrites: true }
    );
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  onCategoryChange(value: PizzaCategory) {
    this.pizzaCategory = value;

    // ✅ En móvil, también navega al cambiar
    if (value === 'simple') this.goToSencillas();
    else this.goToEspeciales();
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
  }

  goToSencillas(): void {
    this.scroll.scrollToId('menu-sencillas', this.headerOffset);
  }

  goToEspeciales(): void {
    this.scroll.scrollToId('menu-especiales', this.headerOffset);
  }
}
