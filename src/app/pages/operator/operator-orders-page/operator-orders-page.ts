import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, auditTime, debounceTime, finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';

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
import { prettyOperatorStatus } from '../../../shared/ui/operator-order-ui.utils';
import { OperatorStatusBoard } from '../../../shared/components/operator-status-board/operator-status-board';
import { OperatorOrderTableRow } from '../../../shared/components/operator-order-table-row/operator-order-table-row';
import { OperatorOrderMobileCard } from '../../../shared/components/operator-order-mobile-card/operator-order-mobile-card';


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
    FormsModule,
    ButtonModule,
    InputTextModule,
    PaginatorModule,
    SkeletonModule,
    SelectModule,
    OperatorStatusBoard,
    OperatorOrderTableRow,
    OperatorOrderMobileCard,
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

    return selectedStatus ? prettyOperatorStatus(selectedStatus) : 'Todos los pedidos';
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
