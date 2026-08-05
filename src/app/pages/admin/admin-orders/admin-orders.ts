import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  RouterLink,
} from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  auditTime,
  debounceTime,
  finalize,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';
import {
  ButtonModule,
} from 'primeng/button';
import {
  InputTextModule,
} from 'primeng/inputtext';
import {
  PaginatorModule,
  PaginatorState,
} from 'primeng/paginator';
import {
  SelectModule,
} from 'primeng/select';
import {
  SkeletonModule,
} from 'primeng/skeleton';
import {
  TagModule,
} from 'primeng/tag';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  OperatorOrdersApiService,
} from '../../../core/api/operator/operator-orders-api.service';
import {
  OperatorOrderListDto,
  QueueCountsDto,
} from '../../../core/api/operator/operator-orders.models';
import {
  OperatorRealtimeService,
} from '../../../core/realtime/operator-realtime.service';
import {
  formatOperatorDate,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../../operator/operator-order-ui.utils';

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

interface FilterOption {
  label: string;
  value: string;
}

interface QueueCard {
  status: string;
  label: string;
  icon: string;
  count: number;
  tone:
    | 'neutral'
    | 'warning'
    | 'info'
    | 'primary'
    | 'success'
    | 'danger';
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-orders.html',
  styleUrl: './admin-orders.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminOrders implements OnDestroy {
  private readonly api =
    inject(OperatorOrdersApiService);

  private readonly realtime =
    inject(OperatorRealtimeService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly messages =
    inject(MessageService);

  private readonly searchChanges =
    new Subject<string>();

  private readonly realtimeRefresh =
    new Subject<void>();

  readonly loading =
    signal(true);

  readonly queueLoading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly orders =
    signal<OperatorOrderListDto[]>([]);

  readonly queue =
    signal<QueueCountsDto>({});

  readonly statusOptions =
    signal<FilterOption[]>([
      {
        label: 'Todos los estados',
        value: '',
      },
    ]);

  readonly total =
    signal(0);

  readonly page =
    signal(1);

  readonly perPage =
    signal(15);

  readonly search =
    signal('');

  readonly status =
    signal<string | null>(null);

  readonly deliveryType =
    signal<string | null>(null);

  readonly paymentMethod =
    signal<string | null>(null);

  readonly deliveryTypeOptions:
    FilterOption[] = [
      {
        label: 'Todos los tipos',
        value: '',
      },
      {
        label: 'Delivery',
        value: 'delivery',
      },
      {
        label: 'Retiro en local',
        value: 'pickup',
      },
    ];

  readonly paymentMethodOptions:
    FilterOption[] = [
      {
        label: 'Todos los pagos',
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
        label: 'Tarjeta / PayPal',
        value: 'card',
      },
    ];

  readonly hasFilters =
    computed(() =>
      this.search().trim() !== '' ||
      !!this.status() ||
      !!this.deliveryType() ||
      !!this.paymentMethod(),
    );

  readonly visibleFrom =
    computed(() => {
      if (this.total() === 0) {
        return 0;
      }

      return (
        (this.page() - 1) *
          this.perPage() +
        1
      );
    });

  readonly visibleTo =
    computed(() =>
      Math.min(
        this.page() *
          this.perPage(),
        this.total(),
      ),
    );

  readonly activeOrdersCount =
    computed(() => {
      const counts = this.queue();

      return (
        Number(counts['pending'] ?? 0) +
        Number(counts['confirmed'] ?? 0) +
        Number(counts['preparing'] ?? 0) +
        Number(counts['ready'] ?? 0) +
        Number(counts['on_the_way'] ?? 0)
      );
    });

  readonly completedOrdersCount =
    computed(() =>
      Number(
        this.queue()['delivered'] ?? 0,
      ),
    );

  readonly cancelledOrdersCount =
    computed(() =>
      Number(
        this.queue()['cancelled'] ?? 0,
      ),
    );

  readonly queueCards =
    computed<QueueCard[]>(() => {
      const counts = this.queue();

      return [
        {
          status: 'pending',
          label: 'Pendientes',
          icon: 'pi pi-clock',
          count: Number(
            counts['pending'] ?? 0,
          ),
          tone: 'warning',
        },
        {
          status: 'confirmed',
          label: 'Confirmados',
          icon: 'pi pi-check-circle',
          count: Number(
            counts['confirmed'] ?? 0,
          ),
          tone: 'info',
        },
        {
          status: 'preparing',
          label: 'En preparación',
          icon: 'pi pi-bolt',
          count: Number(
            counts['preparing'] ?? 0,
          ),
          tone: 'primary',
        },
        {
          status: 'ready',
          label: 'Listos',
          icon: 'pi pi-box',
          count: Number(
            counts['ready'] ?? 0,
          ),
          tone: 'success',
        },
        {
          status: 'on_the_way',
          label: 'En camino',
          icon: 'pi pi-truck',
          count: Number(
            counts['on_the_way'] ?? 0,
          ),
          tone: 'info',
        },
        {
          status: 'delivered',
          label: 'Entregados',
          icon: 'pi pi-verified',
          count: Number(
            counts['delivered'] ?? 0,
          ),
          tone: 'success',
        },
        {
          status: 'cancelled',
          label: 'Cancelados',
          icon: 'pi pi-times-circle',
          count: Number(
            counts['cancelled'] ?? 0,
          ),
          tone: 'danger',
        },
      ];
    });

  constructor() {
    this.searchChanges
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(value => {
        this.search.set(value);
        this.page.set(1);
        this.loadOrders();
      });

    this.realtimeRefresh
      .pipe(
        auditTime(350),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.loadOrders(false);
        this.loadQueue(false);
      });

    this.loadStatuses();
    this.loadOrders();
    this.loadQueue();
    this.setupRealtime();
  }

  onSearchChange(
    value: string,
  ): void {
    this.searchChanges.next(
      value ?? '',
    );
  }

  onFilterChange(): void {
    this.page.set(1);
    this.loadOrders();
  }

  filterByStatus(
    status: string,
  ): void {
    this.status.set(
      this.status() === status
        ? null
        : status,
    );

    this.page.set(1);
    this.loadOrders();
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set(null);
    this.deliveryType.set(null);
    this.paymentMethod.set(null);
    this.page.set(1);

    this.loadOrders();
  }

  refresh(): void {
    if (this.refreshing()) {
      return;
    }

    this.refreshing.set(true);

    this.loadOrders(false);
    this.loadQueue(false);

    window.setTimeout(() => {
      this.refreshing.set(false);
    }, 650);
  }

  onPageChange(
    event: PaginatorState,
  ): void {
    const rows =
      event.rows ??
      this.perPage();

    const first =
      event.first ?? 0;

    this.perPage.set(rows);

    this.page.set(
      Math.floor(first / rows) + 1,
    );

    this.loadOrders();
  }

  prettyStatus(
    value: string,
  ): string {
    return prettyOperatorStatus(value);
  }

  prettyDeliveryType(
    value: string,
  ): string {
    return prettyDeliveryType(value);
  }

  prettyPaymentMethod(
    value: string,
  ): string {
    return prettyPaymentMethod(value);
  }

  formatDate(
    value: string | null,
  ): string {
    return formatOperatorDate(value);
  }

  formatMoney(
    value: number | string,
  ): string {
    const amount =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      Number.isFinite(amount)
        ? amount
        : 0,
    );
  }

  statusSeverity(
    status: string,
  ): TagSeverity {
    if (status === 'pending') {
      return 'warn';
    }

    if (status === 'confirmed') {
      return 'info';
    }

    if (status === 'preparing') {
      return 'warn';
    }

    if (status === 'ready') {
      return 'success';
    }

    if (status === 'on_the_way') {
      return 'info';
    }

    if (status === 'delivered') {
      return 'success';
    }

    if (status === 'cancelled') {
      return 'danger';
    }

    return 'secondary';
  }

  ngOnDestroy(): void {
    this.realtime.stopOperatorOrders();
  }

  private loadOrders(
    showLoading = true,
  ): void {
    if (showLoading) {
      this.loading.set(true);
    }

    const filters = {
      page: this.page(),
      per_page: this.perPage(),
      q:
        this.search().trim() ||
        undefined,
      status:
        this.status() ||
        undefined,
      delivery_type:
        this.deliveryType() ||
        undefined,
      payment_method:
        this.paymentMethod() ||
        undefined,
    };

    this.api
      .list(filters)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          const data =
            response?.data ?? [];

          const meta =
            response?.meta;

          this.orders.set(data);

          this.total.set(
            Number(
              meta?.total ?? 0,
            ),
          );
        },
        error: error => {
          this.orders.set([]);
          this.total.set(0);

          this.messages.add({
            severity: 'error',
            summary:
              'No se cargaron los pedidos',
            detail:
              error?.message ??
              'Ocurrió un problema consultando los pedidos.',
            life: 3200,
          });
        },
      });
  }

  private loadQueue(
    showLoading = true,
  ): void {
    if (showLoading) {
      this.queueLoading.set(true);
    }

    this.api
      .queue()
      .pipe(
        finalize(() => {
          this.queueLoading.set(false);
        }),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.queue.set(
            response?.data ?? {},
          );
        },
        error: () => {
          this.queue.set({});
        },
      });
  }

  private loadStatuses(): void {
    this.api
      .statuses()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          const statuses =
            response?.data ?? [];

          this.statusOptions.set([
            {
              label:
                'Todos los estados',
              value: '',
            },
            ...statuses.map(
              status => ({
                label:
                  this.prettyStatus(
                    status,
                  ),
                value: status,
              }),
            ),
          ]);
        },
        error: () => {
          this.statusOptions.set([
            {
              label:
                'Todos los estados',
              value: '',
            },
          ]);
        },
      });
  }

  private setupRealtime(): void {
    this.realtime
      .ensureOperatorOrdersSubscription();

    this.realtime.orderCreated$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.realtimeRefresh.next();

        this.messages.add({
          severity: 'info',
          summary: 'Nuevo pedido',
          detail:
            'Se recibió un nuevo pedido.',
          life: 2400,
        });
      });

    this.realtime.orderStatusChanged$
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.realtimeRefresh.next();
      });
  }
}
