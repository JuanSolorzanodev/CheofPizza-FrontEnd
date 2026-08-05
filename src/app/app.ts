import {
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { ToastModule } from 'primeng/toast';

import {
  CartStore,
} from './core/api/cart/cart.store';
import {
  Toolbar,
} from './shared/components/toolbar/toolbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Toolbar,
    ToastModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly cart =
    inject(CartStore);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly isAdminRoute =
    signal(
      this.router.url.startsWith(
        '/admin',
      ),
    );

  constructor() {
    this.cart.hydrate();

    this.router.events
      .pipe(
        filter(
          (
            event,
          ): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(event => {
        this.isAdminRoute.set(
          event.urlAfterRedirects.startsWith(
            '/admin',
          ),
        );
      });
  }
}
