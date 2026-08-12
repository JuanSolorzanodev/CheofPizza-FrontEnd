import { DOCUMENT } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router } from '@angular/router';

import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';

import { PaginatorModule } from 'primeng/paginator';

import { SkeletonModule } from 'primeng/skeleton';

import { PaginatorState } from 'primeng/types/paginator';

import { AuthStore } from '../../../core/auth/auth.store';

import {
  MyOrdersApiService,
  MyOrdersPaginationMeta,
} from '../../../core/api/orders/my-orders-api.service';

import { OrderDto } from '../../../core/api/orders/checkout.models';

import { CustomerOrderUpdatedRealtimeEvent } from '../../../core/realtime/realtime.models';

import { CustomerRealtimeService } from '../../../core/realtime/customer-realtime.service';

import { CustomerActiveOrderCardComponent } from '../../../shared/components/customer-active-order-card/customer-active-order-card';

import { CustomerOrderHistoryCardComponent } from '../../../shared/components/customer-order-history-card/customer-order-history-card';

@Component({
  selector: 'app-my-orders-page',

  standalone: true,

  imports: [
    ButtonModule,
    PaginatorModule,
    SkeletonModule,

    CustomerActiveOrderCardComponent,
    CustomerOrderHistoryCardComponent,
  ],

  templateUrl: './my-orders-page.html',

  styleUrl: './my-orders-page.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrdersPage implements OnInit, OnDestroy {
  private readonly api = inject(MyOrdersApiService);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly authStore = inject(AuthStore);

  private readonly realtime = inject(CustomerRealtimeService);

  private readonly document = inject(DOCUMENT);

  readonly perPage = 10;

  readonly initialLoading = signal(true);

  readonly pageLoading = signal(false);

  readonly loadError = signal<string | null>(null);

  readonly orders = signal<OrderDto[]>([]);

  readonly pagination = signal<MyOrdersPaginationMeta>({
    current_page: 1,

    from: null,

    last_page: 1,

    path: '',

    per_page: this.perPage,

    to: null,

    total: 0,
  });

  readonly skeletons = Array.from({
    length: 4,
  });

  readonly activeOrders = computed(() =>
    this.orders().filter((order) => !this.isCompletedOrder(order)),
  );

  readonly historyOrders = computed(() =>
    this.orders().filter((order) => this.isCompletedOrder(order)),
  );

  /**
   * PrimeNG utiliza índice inicial basado en cero.
   */
  readonly paginatorFirst = computed(() => (this.pagination().current_page - 1) * this.perPage);

  readonly hasPagination = computed(() => this.pagination().last_page > 1);

  ngOnInit(): void {
    this.loadPage(1, false);

    this.setupRealtime();
  }

  ngOnDestroy(): void {
    const userId = this.authStore.user()?.id;

    if (userId) {
      this.realtime.stopOrders(userId);
    }
  }

  onPageChange(event: PaginatorState): void {
    const requestedPage = (event.page ?? 0) + 1;

    if (requestedPage === this.pagination().current_page || this.pageLoading()) {
      return;
    }

    this.loadPage(requestedPage, true);
  }

  retry(): void {
    this.loadPage(this.pagination().current_page, false);
  }

  /**
   * Los componentes visuales hijos emiten únicamente el ID.
   * La responsabilidad de navegación permanece en la página.
   */
  openOrder(orderId: number): void {
    void this.router.navigate(['/my/orders', orderId]);
  }

  goToPizzas(): void {
    void this.router.navigate(['/pizzas']);
  }

  private isCompletedOrder(order: OrderDto): boolean {
    const status = (order.status ?? '').trim().toLowerCase();

    return status === 'delivered' || status === 'cancelled' || status === 'canceled';
  }

  private loadPage(
    page: number,

    scrollToTop: boolean,
  ): void {
    const isInitialRequest = this.orders().length === 0;

    this.loadError.set(null);

    if (isInitialRequest) {
      this.initialLoading.set(true);
    } else {
      this.pageLoading.set(true);
    }

    this.api
      .list(page, this.perPage)
      .pipe(
        finalize(() => {
          this.initialLoading.set(false);

          this.pageLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.orders.set(response.data);

          this.pagination.set(response.meta);

          if (scrollToTop) {
            this.document.defaultView?.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }
        },

        error: () => {
          this.loadError.set(
            'No pudimos cargar tus pedidos. Revisa tu conexión e inténtalo nuevamente.',
          );
        },
      });
  }

  private setupRealtime(): void {
    const userId = this.authStore.user()?.id;

    if (!userId) {
      return;
    }

    this.realtime.listenOrders(userId);

    this.realtime.orderUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: CustomerOrderUpdatedRealtimeEvent) => {
        /*
         * Cuando se crea un pedido nuevo, refrescamos la
         * primera página porque el backend es quien define
         * el orden y la paginación real.
         */
        if (event.action === 'created') {
          if (this.pagination().current_page === 1) {
            this.loadPage(1, false);
          }

          return;
        }

        const incomingOrder = event.order;

        const existsOnCurrentPage = this.orders().some((order) => order.id === incomingOrder.id);

        /*
         * Un evento puede corresponder a un pedido ubicado
         * en otra página. No alteramos artificialmente la
         * paginación actual.
         */
        if (!existsOnCurrentPage) {
          return;
        }

        this.orders.update((orders) =>
          orders.map((order) =>
            order.id === incomingOrder.id
              ? {
                  ...order,
                  ...incomingOrder,
                }
              : order,
          ),
        );
      });
  }
}
