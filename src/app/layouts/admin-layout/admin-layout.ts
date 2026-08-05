import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { filter } from 'rxjs';

import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { DrawerModule } from 'primeng/drawer';

import { TooltipModule } from 'primeng/tooltip';

import { AuthStore } from '../../core/auth/auth.store';

import { ThemeService } from '../../core/state/theme.service';

interface AdminNavigationItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

interface AdminNavigationGroup {
  label: string;
  items: AdminNavigationItem[];
}

@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, DrawerModule, TooltipModule],

  templateUrl: './admin-layout.html',

  styleUrl: './admin-layout.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayout {
  private readonly auth = inject(AuthStore);

  private readonly theme = inject(ThemeService);

  private readonly router = inject(Router);

  private readonly toast = inject(MessageService);

  private readonly destroyRef = inject(DestroyRef);

  readonly mobileMenuVisible = signal(false);

  readonly sidebarCollapsed = signal(false);

  readonly avatarBroken = signal(false);

  readonly currentUrl = signal(this.router.url);

  readonly pageTitle = signal('Panel administrativo');

  readonly breadcrumb = signal('Resumen');

  readonly displayName = this.auth.displayName;

  readonly photoUrl = this.auth.photoUrl;

  readonly loggingOut = this.auth.loggingOut;

  readonly themeMode = this.theme.mode;

  readonly userInitial = computed(() => (this.displayName() || 'A').slice(0, 1).toUpperCase());

  readonly themeIcon = computed(() => (this.themeMode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

  readonly collapseIcon = computed(() =>
    this.sidebarCollapsed() ? 'pi pi-angle-right' : 'pi pi-angle-left',
  );

  readonly navigationGroups: AdminNavigationGroup[] = [
    {
      label: 'Principal',

      items: [
        {
          label: 'Resumen',
          icon: 'pi pi-th-large',
          route: '/admin/dashboard',
          exact: true,
        },

        {
          label: 'Pedidos',
          icon: 'pi pi-receipt',
          route: '/admin/orders',
        },

        {
          label: 'Caja',
          icon: 'pi pi-wallet',
          route: '/admin/cash-register',
        },
        {
          label: 'Transacciones',

          icon: 'pi pi-credit-card',

          route: '/admin/transactions',
        },
      ],
    },

    {
      label: 'Catálogo',

      items: [
        {
          label: 'Pizzas',
          icon: 'pi pi-box',
          route: '/admin/catalog/pizzas',
        },

        {
          label: 'Categorías',
          icon: 'pi pi-tags',
          route: '/admin/catalog/categories',
        },

        {
          label: 'Tamaños y precios',
          icon: 'pi pi-dollar',
          route: '/admin/catalog/prices',
        },

        {
          label: 'Ingredientes',
          icon: 'pi pi-list',
          route: '/admin/catalog/ingredients',
        },
      ],
    },

    {
      label: 'Comercial',

      items: [
        {
          label: 'Promociones',
          icon: 'pi pi-percentage',
          route: '/admin/promotions',
        },
      ],
    },

    {
      label: 'Administración',

      items: [
        {
          label: 'Usuarios',
          icon: 'pi pi-users',
          route: '/admin/users',
        },

        {
          label: 'Configuración',
          icon: 'pi pi-cog',
          route: '/admin/settings',
        },

        {
          label: 'Analítica predictiva',

          icon: 'pi pi-chart-line',

          route: '/admin/analytics',
        },
      ],
    },
  ];

  constructor() {
    effect(() => {
      this.photoUrl();

      this.avatarBroken.set(false);
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);

        this.mobileMenuVisible.set(false);

        this.updateRouteMetadata();
      });

    /*
     * El layout puede crearse después del NavigationEnd inicial.
     * Por eso actualizamos los metadatos cuando Angular termina
     * el ciclo actual de activación de rutas.
     */
    queueMicrotask(() => {
      this.updateRouteMetadata();
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  openMobileMenu(): void {
    this.mobileMenuVisible.set(true);
  }

  closeMobileMenu(): void {
    this.mobileMenuVisible.set(false);
  }

  onMobileMenuVisibleChange(visible: boolean): void {
    this.mobileMenuVisible.set(visible);
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  goToStore(): void {
    this.closeMobileMenu();

    void this.router.navigateByUrl('/');
  }

  goToOperator(): void {
    this.closeMobileMenu();

    void this.router.navigateByUrl('/operator/orders');
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.closeMobileMenu();

    await this.auth.logout();

    await this.router.navigateByUrl('/');

    this.toast.add({
      severity: 'success',
      summary: 'Sesión cerrada',
      detail: 'Tu sesión se cerró correctamente.',
      life: 2400,
    });
  }

  private updateRouteMetadata(): void {
    let snapshot = this.router.routerState.snapshot.root;

    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    const data = snapshot.data ?? {};

    const title =
      typeof snapshot.title === 'string' && snapshot.title.trim().length > 0
        ? snapshot.title
        : 'Panel administrativo';

    const breadcrumb = data['breadcrumb'] ?? 'Resumen';

    this.pageTitle.set(title);

    this.breadcrumb.set(String(breadcrumb));
  }
}
