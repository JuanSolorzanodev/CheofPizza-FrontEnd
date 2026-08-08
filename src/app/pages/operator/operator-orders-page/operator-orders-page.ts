import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, auditTime, debounceTime, finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { OperatorOrdersApiService } from '../../../core/api/operator/operator-orders-api.service';
import {
  OperatorOrderListDto,
  OperatorOrdersFilters,
  OrderStatusName,
  QueueCountsDto,
} from '../../../core/api/operator/operator-orders.models';
import { OperatorRealtimeService } from '../../../core/realtime/operator-realtime.service';
import {
  OperatorOrderCreatedRealtimeEvent,
  OperatorOrderStatusChangedRealtimeEvent,
} from '../../../core/realtime/realtime.models';
import { OperatorStatusBoard } from '../components/operator-status-board/operator-status-board';

import {
  formatOperatorDate,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../operator-order-ui.utils';

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

interface SelectOption {
  label: string;
  value: string;
}

interface OperatorPaginatorEvent {
  first?: number;
  rows?: number;
  page?: number;
}

@Component({
  selector: 'app-operator-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    PaginatorModule,
    SkeletonModule,
    SelectModule,
    OperatorStatusBoard,
  ],
  templateUrl: './operator-orders-page.html',
  styleUrl: './operator-orders-page.scss',
})
export class OperatorOrdersPage implements OnDestroy {
  private readonly api = inject(OperatorOrdersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(OperatorRealtimeService);

  private readonly searchInput$ = new Subject<string>();
  private readonly realtimeRefresh$ = new Subject<void>();

  readonly loading = signal(true);
  readonly pageLoading = signal(false);
  readonly loadingQueue = signal(true);

  readonly errorMessage = signal<string | null>(null);
  readonly queueError = signal<string | null>(null);

  readonly orders = signal<OperatorOrderListDto[]>([]);
  readonly queue = signal<QueueCountsDto>({});

  readonly total = signal(0);
  readonly page = signal(1);
  readonly perPage = signal(15);

  readonly q = signal('');
  readonly status = signal<string | null>(null);
  readonly deliveryType = signal<string | null>(null);
  readonly paymentMethod = signal<string | null>(null);

  readonly statusOptions = signal<SelectOption[]>([
    {
      label: 'Todos los estados',
      value: '',
    },
  ]);

  readonly deliveryTypeOptions: SelectOption[] = [
    {
      label: 'Todos los tipos',
      value: '',
    },
    {
      label: 'Entrega a domicilio',
      value: 'delivery',
    },
    {
      label: 'Retiro en el local',
      value: 'pickup',
    },
  ];

  readonly paymentMethodOptions: SelectOption[] = [
    {
      label: 'Todos los métodos',
      value: '',
    },
    {
      label: 'Efectivo',
      value: 'cash',
    },
    {
      label: 'Transferencia',
      value: 'transfer',
    },
    {
      label: 'Tarjeta',
      value: 'card',
    },
    {
      label: 'PayPal',
      value: 'paypal',
    },
  ];

  readonly skeletonRows = Array.from({
    length: 8,
  });

  private readonly activeStatuses: readonly OrderStatusName[] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'on_the_way',
  ];

  readonly activeOrdersTotal = computed(() => {
    const counts = this.queue();

    return this.activeStatuses.reduce(
      (total, statusName) => total + Number(counts[statusName] ?? 0),
      0,
    );
  });

  readonly currentStatusLabel = computed(() => {
    const selectedStatus = this.status();

    return selectedStatus ? this.prettyStatus(selectedStatus) : 'Todos los pedidos';
  });

  readonly hasFilters = computed(() => {
    return (
      this.q().trim().length > 0 ||
      this.status() !== null ||
      this.deliveryType() !== null ||
      this.paymentMethod() !== null
    );
  });

  readonly paginationFrom = computed(() => {
    if (this.total() === 0 || this.orders().length === 0) {
      return 0;
    }

    return (this.page() - 1) * this.perPage() + 1;
  });

  readonly paginationTo = computed(() => {
    if (this.total() === 0 || this.orders().length === 0) {
      return 0;
    }

    return Math.min(this.paginationFrom() + this.orders().length - 1, this.total());
  });

  readonly lastPage = computed(() => {
    return Math.max(1, Math.ceil(this.total() / this.perPage()));
  });

  constructor() {
    this.configureSearch();
    this.configureRealtimeRefresh();

    this.loadStatuses();
    this.load();
    this.loadQueue();
    this.setupRealtime();
  }

  onSearchTyping(value: string): void {
    this.searchInput$.next(value ?? '');
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  selectStatus(statusName: OrderStatusName): void {
    this.status.set(this.status() === statusName ? null : statusName);

    this.page.set(1);
    this.load();
  }

  clearSearch(): void {
    this.q.set('');
    this.searchInput$.next('');
  }

  clearFilters(): void {
    this.q.set('');
    this.status.set(null);
    this.deliveryType.set(null);
    this.paymentMethod.set(null);
    this.page.set(1);

    this.load();
  }

  retry(): void {
    this.load();
    this.loadQueue();
  }

  onPageChange(event: OperatorPaginatorEvent): void {
    const rows = Number(event.rows ?? this.perPage());

    const first = Number(event.first ?? 0);

    const nextPerPage = Number.isFinite(rows) && rows > 0 ? rows : this.perPage();

    const nextPage = Math.floor(first / nextPerPage) + 1;

    if (nextPage === this.page() && nextPerPage === this.perPage()) {
      return;
    }

    this.page.set(nextPage);
    this.perPage.set(nextPerPage);

    this.load(true);
  }

  load(changingPage = false): void {
    this.errorMessage.set(null);

    if (changingPage || this.orders().length > 0) {
      this.pageLoading.set(true);
    } else {
      this.loading.set(true);
    }

    const filters: OperatorOrdersFilters = {
      page: this.page(),
      per_page: this.perPage(),
      q: this.q().trim() || undefined,
      status: this.status() || undefined,
      delivery_type: this.deliveryType() || undefined,
      payment_method: this.paymentMethod() || undefined,
    };

    this.api
      .list(filters)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.pageLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const rows = Array.isArray(response.data) ? response.data : [];

          const responseTotal = Number(response.meta?.total ?? rows.length);

          const responsePage = Number(response.meta?.current_page ?? this.page());

          const responsePerPage = Number(response.meta?.per_page ?? this.perPage());

          this.orders.set(rows);

          this.total.set(Number.isFinite(responseTotal) ? responseTotal : rows.length);

          if (Number.isFinite(responsePage) && responsePage > 0) {
            this.page.set(responsePage);
          }

          if (Number.isFinite(responsePerPage) && responsePerPage > 0) {
            this.perPage.set(responsePerPage);
          }
        },

        error: (error) => {
          this.orders.set([]);
          this.total.set(0);

          this.errorMessage.set(
            this.resolveErrorMessage(error, 'No fue posible cargar los pedidos.'),
          );
        },
      });
  }

  loadQueue(showSkeleton = true): void {
    if (showSkeleton) {
      this.loadingQueue.set(true);
    }

    this.queueError.set(null);

    this.api
      .queue()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadingQueue.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.queue.set(response.data ?? {});
        },

        error: (error) => {
          this.queue.set({});

          this.queueError.set(
            this.resolveErrorMessage(error, 'No fue posible cargar los estados operativos.'),
          );
        },
      });
  }

  loadStatuses(): void {
    this.api
      .statuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const statuses = Array.isArray(response.data) ? response.data : [];

          this.statusOptions.set([
            {
              label: 'Todos los estados',
              value: '',
            },
            ...statuses.map((statusName) => ({
              label: this.prettyStatus(statusName),
              value: statusName,
            })),
          ]);
        },

        error: () => {
          this.statusOptions.set([
            {
              label: 'Todos los estados',
              value: '',
            },
          ]);
        },
      });
  }

  prettyStatus(value: string): string {
    return prettyOperatorStatus(value);
  }

  prettyDeliveryType(value: string): string {
    return prettyDeliveryType(value);
  }

  prettyPaymentMethod(value: string): string {
    return prettyPaymentMethod(value);
  }

  formatDate(value: string | null): string {
    return formatOperatorDate(value);
  }

  statusSeverity(statusName: string): TagSeverity {
    switch (statusName) {
      case 'pending':
        return 'warn';

      case 'confirmed':
        return 'info';

      case 'preparing':
        return 'warn';

      case 'ready':
        return 'success';

      case 'on_the_way':
        return 'info';

      case 'delivered':
        return 'success';

      case 'cancelled':
        return 'danger';

      default:
        return 'secondary';
    }
  }

  statusIcon(statusName: string): string {
    const icons: Record<string, string> = {
      pending: 'pi pi-bell',
      confirmed: 'pi pi-check',
      preparing: 'pi pi-hourglass',
      ready: 'pi pi-check-circle',
      on_the_way: 'pi pi-truck',
      delivered: 'pi pi-verified',
      cancelled: 'pi pi-times-circle',
    };

    return icons[statusName] ?? 'pi pi-circle';
  }

  statusOperationalLabel(statusName: string): string {
    const labels: Record<string, string> = {
      pending: 'Nueva orden',
      confirmed: 'Confirmada',
      preparing: 'En cocina',
      ready: 'Lista para salir',
      on_the_way: 'En reparto',
      delivered: 'Entregada',
      cancelled: 'Cancelada',
    };

    return labels[statusName] ?? this.prettyStatus(statusName);
  }

  rowClass(order: OperatorOrderListDto): string {
    return [
      'order-row',
      `order-row--${order.status}`,
      this.isHistoricalOrder(order) ? 'order-row--historical' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  mobileCardClass(order: OperatorOrderListDto): string {
    return [
      'mobile-order',
      `mobile-order--${order.status}`,
      this.isHistoricalOrder(order) ? 'mobile-order--historical' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  customerName(order: OperatorOrderListDto): string {
    return order.customer?.name?.trim() || 'Cliente no identificado';
  }

  customerPhone(order: OperatorOrderListDto): string {
    return order.customer?.phone?.trim() || 'Sin teléfono';
  }

  isTransfer(order: OperatorOrderListDto): boolean {
    return order.payment_method === 'transfer';
  }

  isDelivery(order: OperatorOrderListDto): boolean {
    return order.delivery_type === 'delivery';
  }

  isHistoricalOrder(order: OperatorOrderListDto): boolean {
    return order.status === 'delivered' || order.status === 'cancelled';
  }

  deliveryIcon(order: OperatorOrderListDto): string {
    return this.isDelivery(order) ? 'pi pi-truck' : 'pi pi-shop';
  }

  paymentIcon(order: OperatorOrderListDto): string {
    switch (order.payment_method) {
      case 'transfer':
        return 'pi pi-building-columns';

      case 'cash':
        return 'pi pi-money-bill';

      case 'paypal':
        return 'pi pi-wallet';

      default:
        return 'pi pi-credit-card';
    }
  }

  private configureSearch(): void {
    this.searchInput$
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.q.set(term);
        this.page.set(1);
        this.load();
      });
  }

  private configureRealtimeRefresh(): void {
    this.realtimeRefresh$
      .pipe(auditTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.load(false);
      });
  }

  private setupRealtime(): void {
    this.realtime.ensureOperatorOrdersSubscription();

    this.realtime.orderCreated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: OperatorOrderCreatedRealtimeEvent) => {
        this.incrementQueue(event.summary.status);

        this.requestRealtimeRefresh();
      });

    this.realtime.orderStatusChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: OperatorOrderStatusChangedRealtimeEvent) => {
        this.moveQueue(event.from_status, event.to_status);

        this.requestRealtimeRefresh();
      });
  }

  private requestRealtimeRefresh(): void {
    this.realtimeRefresh$.next();
  }

  private incrementQueue(statusName: string): void {
    this.queue.update((current) => ({
      ...current,
      [statusName]: Number(current[statusName] ?? 0) + 1,
    }));
  }

  private moveQueue(fromStatus: string, toStatus: string): void {
    this.queue.update((current) => ({
      ...current,

      [fromStatus]: Math.max(Number(current[fromStatus] ?? 0) - 1, 0),

      [toStatus]: Number(current[toStatus] ?? 0) + 1,
    }));
  }
  private resolveErrorMessage(error: unknown, fallback: string): string {
    const response = error as {
      error?: {
        message?: string;
      };
    };

    return response?.error?.message ?? fallback;
  }

  ngOnDestroy(): void {
    this.realtime.stopOperatorOrders();
  }

  clearStatus(): void {
    if (this.status() === null) {
      return;
    }

    this.status.set(null);
    this.page.set(1);

    this.load();
  }
}
