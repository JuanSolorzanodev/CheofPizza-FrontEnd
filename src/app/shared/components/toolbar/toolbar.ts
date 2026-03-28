import { Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';

import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';

import { ThemeService } from '../../../core/state/theme.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { GoogleLoginDialogComponent } from '../google-login-dialog/google-login-dialog';
import { ScrollService } from '../../ui/scroll.service';
import { CartPopover } from '../cart-popover/cart-popover';
import { ROLE_IDS } from '../../../core/auth/roles';

type PizzaCategory = 'simple' | 'special';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    ToolbarModule,
    ButtonModule,
    SelectButtonModule,
    FormsModule,
    RouterModule,
    GoogleLoginDialogComponent,
    CartPopover,
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  private readonly scroll = inject(ScrollService);
  private readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  private readonly headerOffset = 90;

  // ✅ Detecta si estamos en /operator/*
  private readonly currentUrl = signal<string>(this.router.url);
  readonly isOperatorView = computed(() => this.currentUrl().startsWith('/operator'));

  readonly mode = this.theme.mode;
  readonly themeIcon = computed(() => (this.mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly displayName = this.auth.displayName;
  readonly photoUrl = this.auth.photoUrl;

  readonly avatarBroken = signal(false);

  // Roles
  readonly roleId = computed(() => this.auth.user()?.role_id ?? null);

  readonly isOperatorOrAdmin = computed(() => {
    const id = this.roleId();
    return id === ROLE_IDS.operator || id === ROLE_IDS.admin;
  });

  readonly isCustomer = computed(() => this.roleId() === ROLE_IDS.customer);

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

    // ✅ Track URL para isOperatorView()
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.currentUrl.set(e.urlAfterRedirects));
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  onCategoryChange(value: PizzaCategory) {
    this.pizzaCategory = value;
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

  goToMyOrders(): void {
    this.router.navigate(['/my/orders']);
  }

  goToOperator(): void {
    this.router.navigate(['/operator/orders']);
  }
}
