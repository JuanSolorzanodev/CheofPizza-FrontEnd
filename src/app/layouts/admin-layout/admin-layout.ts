import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

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

type PendingMobileAction =
  | {
      type: 'navigate';
      url: string;
    }
  | {
      type: 'logout';
    }
  | null;

@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ButtonModule,
    DrawerModule,
    TooltipModule,
  ],

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

  /*
   * Acción pendiente del drawer móvil.
   *
   * Importante:
   * no navegamos mientras PrimeNG todavía está ejecutando
   * la animación de salida del drawer.
   *
   * La acción se ejecuta únicamente desde onMobileDrawerHide().
   */
  private pendingMobileAction: PendingMobileAction = null;

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

  readonly userInitial = computed(() =>
    (this.displayName() || 'A')
      .slice(0, 1)
      .toUpperCase(),
  );

  readonly themeIcon = computed(() =>
    this.themeMode() === 'dark'
      ? 'pi pi-sun'
      : 'pi pi-moon',
  );

  readonly collapseIcon = computed(() =>
    this.sidebarCollapsed()
      ? 'pi pi-angle-right'
      : 'pi pi-angle-left',
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
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);

        /*
         * Si una navegación ocurre por cualquier otro medio,
         * garantizamos que el drawer quede sincronizado.
         */
        this.mobileMenuVisible.set(false);

        this.updateRouteMetadata();
      });

    /*
     * El layout puede crearse después del NavigationEnd inicial.
     * Por eso actualizamos los metadatos al finalizar
     * el ciclo actual de activación.
     */
    queueMicrotask(() => {
      this.updateRouteMetadata();
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(
      (value) => !value,
    );
  }

  openMobileMenu(): void {
    /*
     * Al abrir un nuevo drawer no debe existir una acción
     * pendiente de una interacción anterior.
     */
    this.pendingMobileAction = null;

    this.mobileMenuVisible.set(true);
  }

  closeMobileMenu(): void {
    this.pendingMobileAction = null;

    this.mobileMenuVisible.set(false);
  }

  onMobileMenuVisibleChange(
    visible: boolean,
  ): void {
    this.mobileMenuVisible.set(visible);

    /*
     * Si el usuario cerró el drawer manualmente
     * (máscara, ESC o botón de cierre), no ejecutamos
     * ninguna navegación pendiente accidental.
     */
    if (!visible && !this.pendingMobileAction) {
      return;
    }
  }

  /**
   * Se ejecuta cuando PrimeNG terminó realmente
   * la animación y limpieza del Drawer.
   *
   * Este es el punto seguro para cambiar a otro layout.
   */
  async onMobileDrawerHide(): Promise<void> {
    this.mobileMenuVisible.set(false);

    const action =
      this.pendingMobileAction;

    this.pendingMobileAction = null;

    if (!action) {
      return;
    }

    if (action.type === 'navigate') {
      await this.router.navigateByUrl(
        action.url,
      );

      return;
    }

    await this.performLogout();
  }

  onAvatarError(): void {
    this.avatarBroken.set(true);
  }

  /**
   * Navegación interna dentro del mismo layout admin.
   *
   * Primero cerramos correctamente el Drawer.
   * La navegación se ejecutará desde onHide.
   */
  navigateFromMobileMenu(
    url: string,
  ): void {
    this.pendingMobileAction = {
      type: 'navigate',
      url,
    };

    this.mobileMenuVisible.set(false);
  }

  /**
   * Desktop:
   * navegación inmediata porque no existe drawer modal.
   */
  goToStore(): void {
    void this.router.navigateByUrl('/');
  }

  /**
   * Desktop:
   * navegación inmediata porque no existe drawer modal.
   */
  goToOperator(): void {
    void this.router.navigateByUrl(
      '/operator/orders',
    );
  }

  /**
   * Mobile:
   * esperamos a que PrimeNG retire la máscara
   * antes de destruir AdminLayout.
   */
  goToStoreFromMobile(): void {
    this.pendingMobileAction = {
      type: 'navigate',
      url: '/',
    };

    this.mobileMenuVisible.set(false);
  }

  /**
   * Mobile:
   * este es el caso que provocaba la máscara huérfana.
   */
  goToOperatorFromMobile(): void {
    this.pendingMobileAction = {
      type: 'navigate',
      url: '/operator/orders',
    };

    this.mobileMenuVisible.set(false);
  }

  /**
   * Logout desde escritorio.
   */
  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    await this.performLogout();
  }

  /**
   * Logout desde el drawer móvil.
   *
   * No destruimos el layout hasta que Drawer
   * haya finalizado su cierre.
   */
  logoutFromMobile(): void {
    if (this.loggingOut()) {
      return;
    }

    this.pendingMobileAction = {
      type: 'logout',
    };

    this.mobileMenuVisible.set(false);
  }

  private async performLogout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    await this.auth.logout();

    await this.router.navigateByUrl('/');

    this.toast.add({
      severity: 'success',
      summary: 'Sesión cerrada',
      detail:
        'Tu sesión se cerró correctamente.',
      life: 2400,
    });
  }

  private updateRouteMetadata(): void {
    let snapshot =
      this.router.routerState.snapshot.root;

    while (snapshot.firstChild) {
      snapshot = snapshot.firstChild;
    }

    const data =
      snapshot.data ?? {};

    const title =
      typeof snapshot.title === 'string' &&
      snapshot.title.trim().length > 0
        ? snapshot.title
        : 'Panel administrativo';

    const breadcrumb =
      data['breadcrumb'] ?? 'Resumen';

    this.pageTitle.set(title);

    this.breadcrumb.set(
      String(breadcrumb),
    );
  }
}
