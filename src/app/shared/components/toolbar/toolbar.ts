import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  NavigationEnd,
  Router,
} from '@angular/router';

import {
  filter,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';

import {
  DrawerModule,
} from 'primeng/drawer';

import {
  AuthStore,
} from '../../../core/auth/auth.store';

import {
  ROLE_IDS,
} from '../../../core/auth/roles';

import {
  ThemeService,
} from '../../../core/state/theme.service';

import {
  ScrollService,
} from '../../ui/scroll.service';

import {
  CartPopover,
} from '../cart-popover/cart-popover';

import {
  GoogleLoginDialogComponent,
} from '../google-login-dialog/google-login-dialog';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    DrawerModule,
    GoogleLoginDialogComponent,
    CartPopover,
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class Toolbar {
  @ViewChild(
    GoogleLoginDialogComponent,
  )
  private loginDialog?:
    GoogleLoginDialogComponent;

  private readonly scroll =
    inject(ScrollService);

  private readonly theme =
    inject(ThemeService);

  private readonly auth =
    inject(AuthStore);

  private readonly router =
    inject(Router);

  private readonly toast =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly headerOffset =
    82;

  private readonly currentUrl =
    signal(this.router.url);

  readonly mobileMenuVisible =
    signal(false);

  readonly avatarBroken =
    signal(false);

  readonly mode =
    this.theme.mode;

  readonly isAuthenticated =
    this.auth.isAuthenticated;

  readonly displayName =
    this.auth.displayName;

  readonly photoUrl =
    this.auth.photoUrl;

  readonly loggingOut =
    this.auth.loggingOut;

  readonly roleId =
    computed(
      () =>
        this.auth.user()
          ?.role_id ??
        null,
    );

  readonly isAdmin =
    computed(
      () =>
        this.roleId() ===
        ROLE_IDS.admin,
    );

  readonly isOperator =
    computed(
      () =>
        this.roleId() ===
        ROLE_IDS.operator,
    );

  readonly isCustomer =
    computed(
      () =>
        this.roleId() ===
        ROLE_IDS.customer,
    );

  readonly isOperatorOrAdmin =
    computed(() => {
      const roleId =
        this.roleId();

      return (
        roleId ===
          ROLE_IDS.operator ||
        roleId ===
          ROLE_IDS.admin
      );
    });

  readonly isBackofficeView =
    computed(() => {
      const url =
        this.currentUrl();

      return (
        url.startsWith(
          '/operator',
        ) ||
        url.startsWith(
          '/admin',
        )
      );
    });

  readonly isOperatorView =
    computed(
      () =>
        this.currentUrl()
          .startsWith(
            '/operator',
          ),
    );

  readonly isAdminView =
    computed(
      () =>
        this.currentUrl()
          .startsWith(
            '/admin',
          ),
    );

  readonly isMyOrdersView =
    computed(
      () =>
        this.currentUrl()
          .startsWith(
            '/my/orders',
          ),
    );

  readonly isHomeView =
    computed(() => {
      const url =
        this.currentUrl();

      return (
        url === '/' ||
        url.startsWith('/?') ||
        url.startsWith('/#')
      );
    });

  readonly themeIcon =
    computed(
      () =>
        this.mode() ===
        'dark'
          ? 'pi pi-sun'
          : 'pi pi-moon',
    );

  readonly themeLabel =
    computed(
      () =>
        this.mode() ===
        'dark'
          ? 'Activar modo claro'
          : 'Activar modo oscuro',
    );

  readonly roleLabel =
    computed(() => {
      if (this.isAdmin()) {
        return 'Administrador';
      }

      if (this.isOperator()) {
        return 'Operador';
      }

      return 'Cliente';
    });

  readonly userInitial =
    computed(
      () =>
        (
          this.displayName() ||
          'U'
        )
          .trim()
          .slice(0, 1)
          .toUpperCase(),
    );

  constructor() {
    effect(() => {
      this.photoUrl();

      this.avatarBroken.set(
        false,
      );
    });

    this.router.events
      .pipe(
        filter(
          (
            event,
          ): event is NavigationEnd =>
            event instanceof
            NavigationEnd,
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(event => {
        this.currentUrl.set(
          event.urlAfterRedirects,
        );

        this.closeMobileMenu();
      });
  }

  openLoginDialog(): void {
    this.closeMobileMenu();

    this.loginDialog?.open();
  }

  openMobileMenu(): void {
    this.mobileMenuVisible.set(
      true,
    );
  }

  closeMobileMenu(): void {
    this.mobileMenuVisible.set(
      false,
    );
  }

  onMobileMenuVisibleChange(
    visible: boolean,
  ): void {
    this.mobileMenuVisible.set(
      visible,
    );
  }

  onAvatarError(): void {
    this.avatarBroken.set(
      true,
    );
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.closeMobileMenu();

    await this.auth.logout();

    await this.router.navigateByUrl(
      '/',
    );

    this.toast.add({
      severity: 'success',
      summary: 'Sesión cerrada',
      detail:
        'Tu sesión se cerró correctamente.',
    });
  }

  goToHome(): void {
    this.closeMobileMenu();

    void this.router.navigateByUrl(
      '/',
    );
  }

  goToAnalytics(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.closeMobileMenu();

    void this.router.navigateByUrl(
      '/admin/analytics',
    );
  }

  goToOperator(): void {
    if (
      !this.isOperatorOrAdmin()
    ) {
      return;
    }

    this.closeMobileMenu();

    void this.router.navigateByUrl(
      '/operator/orders',
    );
  }

  goToMyOrders(): void {
    if (
      !this.isAuthenticated()
    ) {
      return;
    }

    this.closeMobileMenu();

    void this.router.navigateByUrl(
      '/my/orders',
    );
  }

  goToSencillas(): void {
    this.navigateHomeAndScroll(
      'menu-sencillas',
    );
  }

  goToEspeciales(): void {
    this.navigateHomeAndScroll(
      'menu-especiales',
    );
  }

  private navigateHomeAndScroll(
    elementId: string,
  ): void {
    this.closeMobileMenu();

    if (this.isHomeView()) {
      this.scroll.scrollToId(
        elementId,
        this.headerOffset,
      );

      return;
    }

    void this.router
      .navigateByUrl('/')
      .then(navigated => {
        if (!navigated) {
          return;
        }

        window.setTimeout(
          () => {
            this.scroll.scrollToId(
              elementId,
              this.headerOffset,
            );
          },
          120,
        );
      });
  }
}
