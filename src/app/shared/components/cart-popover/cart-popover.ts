import {
  CommonModule,
  CurrencyPipe,
  DOCUMENT,
} from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterModule,
} from '@angular/router';
import {
  filter,
} from 'rxjs';

import {
  ButtonModule,
} from 'primeng/button';
import {
  DrawerModule,
} from 'primeng/drawer';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  CartItemDto,
} from '../../../core/api/cart/cart.models';
import {
  CartStore,
} from '../../../core/api/cart/cart.store';

@Component({
  selector: 'app-cart-popover',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    ButtonModule,
    DrawerModule,
    TooltipModule,
  ],
  templateUrl:
    './cart-popover.html',
  styleUrl:
    './cart-popover.scss',
})
export class CartPopover {
  private readonly router =
    inject(Router);

  private readonly document =
    inject(DOCUMENT);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly cart =
    inject(CartStore);

  private readonly currentUrl =
    signal(this.router.url);

  readonly drawerVisible =
    signal(false);

  readonly isCheckoutPage =
    computed(() => {
      const url =
        this.currentUrl()
          .split('?')[0]
          .split('#')[0];

      return (
        url === '/checkout' ||
        url.startsWith('/checkout/')
      );
    });

  readonly triggerLabel =
    computed(() =>
      this.isCheckoutPage()
        ? 'Ver resumen del pedido'
        : 'Abrir tu pedido',
    );

  readonly itemCountLabel =
    computed(() => {
      const total =
        this.cart.totalUnits();

      return total === 1
        ? '1 pizza'
        : `${total} pizzas`;
    });

  constructor() {
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
        this.currentUrl.set(
          event.urlAfterRedirects,
        );

        this.closeDrawer();
      });
  }

  onTriggerClick(): void {
    if (this.isCheckoutPage()) {
      this.scrollToCheckoutSummary();

      return;
    }

    this.openDrawer();
  }

  openDrawer(): void {
    this.drawerVisible.set(true);
  }

  closeDrawer(): void {
    this.drawerVisible.set(false);
  }

  onDrawerVisibleChange(
    visible: boolean,
  ): void {
    this.drawerVisible.set(visible);
  }

  clearCart(): void {
    if (
      this.cart.loading() ||
      this.cart.isEmpty()
    ) {
      return;
    }

    this.cart.clear();
  }

  decrease(
    item: CartItemDto,
  ): void {
    if (
      this.cart.loading() ||
      item.quantity <= 1
    ) {
      return;
    }

    this.cart.setQuantity(
      item.id,
      item.quantity - 1,
    );
  }

  increase(
    item: CartItemDto,
  ): void {
    if (
      this.cart.loading() ||
      item.quantity >= 10
    ) {
      return;
    }

    this.cart.setQuantity(
      item.id,
      item.quantity + 1,
    );
  }

  remove(
    item: CartItemDto,
  ): void {
    if (this.cart.loading()) {
      return;
    }

    this.cart.remove(item.id);
  }

  itemName(
    item: CartItemDto,
  ): string {
    if (
      item.item_type ===
      'promotion'
    ) {
      return (
        item.promotion?.name ??
        'Promoción'
      );
    }

    if (
      item.is_half_and_half
    ) {
      const first =
        item.pizza?.name ??
        'Pizza';

      const second =
        item.pizza_second?.name ??
        'Pizza';

      return `${first} + ${second}`;
    }

    return (
      item.pizza?.name ??
      'Pizza'
    );
  }

  itemImage(
    item: CartItemDto,
  ): string | null {
    if (
      item.item_type ===
      'promotion'
    ) {
      return (
        item.promotion
          ?.banner_image_url ??
        item.selected_pizzas
          ?.[0]
          ?.image_url ??
        null
      );
    }

    return (
      item.pizza?.image_url ??
      item.pizza_second?.image_url ??
      null
    );
  }

  itemDescription(
    item: CartItemDto,
  ): string {
    const details: string[] =
      [];

    if (item.size?.name) {
      details.push(
        item.size.name,
      );
    }

    if (
      item.item_type ===
      'promotion'
    ) {
      details.push(
        'Promoción',
      );
    }

    if (
      item.is_half_and_half
    ) {
      details.push(
        'Mitad y mitad',
      );
    }

    const extras =
      item.extras?.length ??
      0;

    if (extras > 0) {
      details.push(
        extras === 1
          ? '1 extra'
          : `${extras} extras`,
      );
    }

    return (
      details.join(' · ') ||
      'Preparada a tu gusto'
    );
  }

  selectedPizzasLabel(
    item: CartItemDto,
  ): string | null {
    const names =
      item.selected_pizzas
        ?.map(
          pizza =>
            pizza.name.trim(),
        )
        .filter(
          name =>
            name !== '',
        ) ??
      [];

    return names.length > 0
      ? names.join(' + ')
      : null;
  }

  private scrollToCheckoutSummary(): void {
    const summary =
      this.document
        .querySelector<HTMLElement>(
          '.checkout-summary',
        );

    if (!summary) {
      return;
    }

    summary.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    summary.classList.add(
      'checkout-summary-highlight',
    );

    window.setTimeout(
      () => {
        summary.classList.remove(
          'checkout-summary-highlight',
        );
      },
      900,
    );
  }
}
