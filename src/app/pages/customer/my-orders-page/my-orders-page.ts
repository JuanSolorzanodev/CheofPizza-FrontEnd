import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { PaginatorState } from 'primeng/types/paginator';

import {
  MyOrdersApiService,
  MyOrdersPaginationMeta,
} from '../../../core/api/orders/my-orders-api.service';
import { OrderDto, OrderStatusCode } from '../../../core/api/orders/checkout.models';
import { CustomerOrderUpdatedRealtimeEvent } from '../../../core/realtime/realtime.models';
import { AuthStore } from '../../../core/auth/auth.store';
import { CustomerRealtimeService } from '../../../core/realtime/customer-realtime.service';

type StepKey = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered';

interface OrderStep {
  key: StepKey;
  label: string;
  shortLabel: string;
}

@Component({
  selector: 'app-my-orders-page',
  standalone: true,
  imports: [ButtonModule, CurrencyPipe, DecimalPipe, PaginatorModule, SkeletonModule],
  templateUrl: './my-orders-page.html',
  styleUrls: ['./my-orders-page.scss'],
})
export class MyOrdersPage implements OnInit, OnDestroy {
  private readonly api = inject(MyOrdersApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStore);
  private readonly realtime = inject(CustomerRealtimeService);

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

  readonly skeletons = Array.from({ length: 4 });

  private readonly deliverySteps: readonly OrderStep[] = [
    {
      key: 'pending',
      label: 'Pedido recibido',
      shortLabel: 'Recibido',
    },
    {
      key: 'confirmed',
      label: 'Pedido confirmado',
      shortLabel: 'Confirmado',
    },
    {
      key: 'preparing',
      label: 'Pedido en preparación',
      shortLabel: 'Preparando',
    },
    {
      key: 'ready',
      label: 'Listo para entregar',
      shortLabel: 'Listo',
    },
    {
      key: 'on_the_way',
      label: 'Pedido en camino',
      shortLabel: 'En camino',
    },
    {
      key: 'delivered',
      label: 'Pedido entregado',
      shortLabel: 'Entregado',
    },
  ];

  private readonly pickupSteps: readonly OrderStep[] = [
    {
      key: 'pending',
      label: 'Pedido recibido',
      shortLabel: 'Recibido',
    },
    {
      key: 'confirmed',
      label: 'Pedido confirmado',
      shortLabel: 'Confirmado',
    },
    {
      key: 'preparing',
      label: 'Pedido en preparación',
      shortLabel: 'Preparando',
    },
    {
      key: 'ready',
      label: 'Listo para retirar',
      shortLabel: 'Listo',
    },
    {
      key: 'delivered',
      label: 'Pedido retirado',
      shortLabel: 'Retirado',
    },
  ];

  readonly activeOrders = computed(() =>
    this.orders().filter((order) => this.isActiveOrder(order)),
  );

  readonly historyOrders = computed(() =>
    this.orders().filter((order) => this.isCompletedOrder(order)),
  );

  /**
   * PrimeNG utiliza un índice inicial basado en cero.
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

  openOrder(order: OrderDto): void {
    void this.router.navigate(['/my/orders', order.id]);
  }

  goToPizzas(): void {
    void this.router.navigate(['/pizzas']);
  }

  stepsFor(order: OrderDto): readonly OrderStep[] {
    return this.isPickup(order) ? this.pickupSteps : this.deliverySteps;
  }

  isPickup(order: OrderDto): boolean {
    return this.normalize(order.delivery_type) === 'pickup';
  }

  isDelivery(order: OrderDto): boolean {
    return this.normalize(order.delivery_type) === 'delivery';
  }

  isCancelledOrder(order: OrderDto): boolean {
    const status = this.normalizeStatus(order.status);

    return status === 'cancelled' || status === 'canceled';
  }

  isDeliveredOrder(order: OrderDto): boolean {
    return this.normalizeStatus(order.status) === 'delivered';
  }

  isCompletedOrder(order: OrderDto): boolean {
    return this.isDeliveredOrder(order) || this.isCancelledOrder(order);
  }

  isActiveOrder(order: OrderDto): boolean {
    return !this.isCompletedOrder(order);
  }

  isCurrentStep(order: OrderDto, step: StepKey): boolean {
    return this.normalizeStatus(order.status) === step;
  }

  isStepCompleted(order: OrderDto, step: StepKey): boolean {
    if (this.isCancelledOrder(order)) {
      return false;
    }

    const steps = this.stepsFor(order);
    const currentIndex = this.currentStepIndex(order);
    const stepIndex = steps.findIndex((item) => item.key === step);

    return stepIndex >= 0 && stepIndex <= currentIndex;
  }

  currentStepNumber(order: OrderDto): number {
    return this.currentStepIndex(order) + 1;
  }

  totalSteps(order: OrderDto): number {
    return this.stepsFor(order).length;
  }

  progressPercentage(order: OrderDto): number {
    const totalSteps = this.totalSteps(order);

    if (totalSteps <= 1 || this.isCancelledOrder(order)) {
      return this.isCancelledOrder(order) ? 0 : 100;
    }

    const progress = (this.currentStepIndex(order) / (totalSteps - 1)) * 100;

    return Math.max(0, Math.min(100, progress));
  }

  statusLabel(order: OrderDto): string {
    const status = this.normalizeStatus(order.status);

    const labels: Record<string, string> = {
      pending: 'Pedido recibido',
      confirmed: 'Pedido confirmado',
      preparing: 'En preparación',
      ready: this.isPickup(order) ? 'Listo para retirar' : 'Listo para entregar',
      on_the_way: 'En camino',
      delivered: this.isPickup(order) ? 'Pedido retirado' : 'Pedido entregado',
      cancelled: 'Pedido cancelado',
      canceled: 'Pedido cancelado',
    };

    return labels[status] ?? 'Estado no disponible';
  }

  statusDescription(order: OrderDto): string {
    const status = this.normalizeStatus(order.status);

    if (this.isPickup(order)) {
      const descriptions: Record<string, string> = {
        pending:
          'Recibimos tu pedido. En breve confirmaremos que toda la información esté correcta.',
        confirmed: 'Tu pedido fue confirmado y pronto comenzaremos a prepararlo.',
        preparing: 'Estamos preparando tu pedido con ingredientes frescos.',
        ready: 'Tu pedido está listo. Puedes acercarte al local para retirarlo.',
        delivered: 'El pedido fue retirado correctamente. ¡Buen provecho!',
        cancelled: 'Este pedido fue cancelado y ya no continuará procesándose.',
        canceled: 'Este pedido fue cancelado y ya no continuará procesándose.',
      };

      return descriptions[status] ?? 'Consulta el detalle para obtener más información.';
    }

    const descriptions: Record<string, string> = {
      pending: 'Recibimos tu pedido. En breve confirmaremos que toda la información esté correcta.',
      confirmed: 'Tu pedido fue confirmado y pronto comenzaremos a prepararlo.',
      preparing: 'Estamos preparando tu pedido con ingredientes frescos.',
      ready: 'Tu pedido está listo y será asignado para la entrega.',
      on_the_way: 'Tu pedido salió del local y se encuentra en camino.',
      delivered: 'El pedido fue entregado correctamente. ¡Buen provecho!',
      cancelled: 'Este pedido fue cancelado y ya no continuará procesándose.',
      canceled: 'Este pedido fue cancelado y ya no continuará procesándose.',
    };

    return descriptions[status] ?? 'Consulta el detalle para obtener más información.';
  }

  nextStepLabel(order: OrderDto): string | null {
    if (this.isCompletedOrder(order)) {
      return null;
    }

    const steps = this.stepsFor(order);
    const nextStep = steps[this.currentStepIndex(order) + 1];

    return nextStep?.label ?? null;
  }

  deliveryLabel(deliveryType: string): string {
    return this.normalize(deliveryType) === 'pickup' ? 'Retiro en el local' : 'Entrega a domicilio';
  }

  deliveryIcon(deliveryType: string): string {
    return this.normalize(deliveryType) === 'pickup' ? 'pi pi-shop' : 'pi pi-truck';
  }

  paymentLabel(paymentMethod: string): string {
    const normalized = this.normalize(paymentMethod);

    const labels: Record<string, string> = {
      transfer: 'Transferencia',
      cash: 'Efectivo',
      card: 'Tarjeta',
      paypal: 'PayPal',
    };

    return labels[normalized] ?? paymentMethod ?? 'No especificado';
  }

  paymentIcon(paymentMethod: string): string {
    const normalized = this.normalize(paymentMethod);

    const icons: Record<string, string> = {
      transfer: 'pi pi-building-columns',
      cash: 'pi pi-money-bill',
      card: 'pi pi-credit-card',
      paypal: 'pi pi-wallet',
    };

    return icons[normalized] ?? 'pi pi-wallet';
  }

  orderAddress(order: OrderDto): string {
    return order.address?.trim() || 'Dirección no registrada';
  }

  orderReference(order: OrderDto): string | null {
    return order.delivery_location?.reference?.trim() || null;
  }

  statusClass(order: OrderDto): string {
    return `order-status order-status--${this.normalizeStatus(order.status)}`;
  }

  historyCardClass(order: OrderDto): string {
    return this.isCancelledOrder(order)
      ? 'history-card history-card--cancelled'
      : 'history-card history-card--delivered';
  }

  relativeDateLabel(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Fecha no disponible';
    }

    const now = new Date();

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const orderDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const differenceInDays = Math.round((today.getTime() - orderDay.getTime()) / 86_400_000);

    const time = new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);

    if (differenceInDays === 0) {
      return `Hoy, ${time}`;
    }

    if (differenceInDays === 1) {
      return `Ayer, ${time}`;
    }

    const formattedDate = new Intl.DateTimeFormat('es-EC', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
    })
      .format(date)
      .replace('.', '');

    return `${formattedDate}, ${time}`;
  }

  private loadPage(page: number, scrollToTop: boolean): void {
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

          if (scrollToTop && typeof window !== 'undefined') {
            window.scrollTo({
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
        if (event.action === 'created') {
          /*
           * El nuevo pedido debe ocupar su posición real
           * según la ordenación del backend.
           *
           * Por eso recargamos silenciosamente la primera
           * página en lugar de insertarlo manualmente.
           */
          if (this.pagination().current_page === 1) {
            this.loadPage(1, false);
          }

          return;
        }

        const incomingOrder = event.order;

        const existsOnCurrentPage = this.orders().some((order) => order.id === incomingOrder.id);

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

  private currentStepIndex(order: OrderDto): number {
    const status = this.normalizeStatus(order.status);

    const index = this.stepsFor(order).findIndex((step) => step.key === status);

    return index >= 0 ? index : 0;
  }

  private normalizeStatus(status: OrderStatusCode | string | null | undefined): string {
    return this.normalize(status);
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }
}
