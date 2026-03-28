import { CommonModule, KeyValuePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, auditTime, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { PaginatorModule } from 'primeng/paginator';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';

import { OperatorRealtimeService } from '../../../core/realtime/operator-realtime.service';
import { OperatorOrdersApiService } from '../../../core/api/operator/operator-orders-api.service';
import {
  OperatorOrderListDto,
  QueueCountsDto,
} from '../../../core/api/operator/operator-orders.models';
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

@Component({
  selector: 'app-operator-orders-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    PaginatorModule,
    SkeletonModule,
    SelectModule,
    KeyValuePipe,
  ],
  templateUrl: './operator-orders-page.html',
  styleUrl: './operator-orders-page.scss',
})
export class OperatorOrdersPage {
  private readonly api = inject(OperatorOrdersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(OperatorRealtimeService);

  private readonly search$ = new Subject<string>();
  private readonly listRefresh$ = new Subject<void>();

  readonly loading = signal(true);
  readonly loadingQueue = signal(true);

  readonly orders = signal<OperatorOrderListDto[]>([]);
  readonly total = signal(0);
  readonly queue = signal<QueueCountsDto>({} as QueueCountsDto);

  readonly page = signal(1);
  readonly perPage = signal(15);

  readonly q = signal<string>('');
  readonly status = signal<string | null>(null);
  readonly deliveryType = signal<string | null>(null);
  readonly paymentMethod = signal<string | null>(null);

  readonly statusOptions = signal<Array<{ label: string; value: string }>>([]);

  readonly deliveryTypeOptions = [
    { label: 'Todos', value: '' },
    { label: 'Delivery', value: 'delivery' },
    { label: 'Retiro en local', value: 'pickup' },
  ];

  readonly paymentMethodOptions = [
    { label: 'Todos', value: '' },
    { label: 'Efectivo', value: 'cash' },
    { label: 'Transferencia', value: 'transfer' },
    { label: 'Tarjeta', value: 'card' },
  ];

  constructor() {
    this.search$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.q.set(term);
        this.page.set(1);
        this.load();
      });

    this.listRefresh$
      .pipe(auditTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.load(false);
      });

    this.loadStatuses();
    this.load();
    this.loadQueue();
    this.setupRealtime();
  }

  private setupRealtime(): void {
    this.realtime.ensureOperatorOrdersSubscription();

    this.realtime.orderCreated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        console.log('[operator page] orderCreated$', payload);

        const createdStatus = String(payload?.summary?.status ?? 'pending');
        this.incrementQueue(createdStatus);
        this.requestListRefresh();
      });

    this.realtime.orderStatusChanged$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        console.log('[operator page] orderStatusChanged$', payload);

        const from = String(payload?.from_status ?? '');
        const to = String(payload?.to_status ?? '');

        if (from && to) {
          this.moveQueue(from, to);
        }

        this.requestListRefresh();
      });
  }

  private requestListRefresh(): void {
    this.listRefresh$.next();
  }

  private incrementQueue(status: string): void {
    this.queue.update((current) => ({
      ...current,
      [status]: (current?.[status] ?? 0) + 1,
    }));
  }

  private moveQueue(from: string, to: string): void {
    this.queue.update((current) => ({
      ...current,
      [from]: Math.max((current?.[from] ?? 0) - 1, 0),
      [to]: (current?.[to] ?? 0) + 1,
    }));
  }

  load(showSkeleton = true): void {
    if (showSkeleton) {
      this.loading.set(true);
    }

    const filters: Record<string, any> = {
      page: this.page(),
      per_page: this.perPage(),
      q: this.q().trim() || undefined,
      status: this.status() || undefined,
      delivery_type: this.deliveryType() || undefined,
      payment_method: this.paymentMethod() || undefined,
    };

    this.api
      .list(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const data = res?.data ?? res?.data?.data ?? res?.items ?? [];
          const meta = res?.meta ?? res?.data?.meta ?? null;

          this.orders.set(data ?? []);
          this.total.set(meta?.total ?? res?.total ?? 0);
        },
        error: () => {
          this.orders.set([]);
          this.total.set(0);
        },
        complete: () => this.loading.set(false),
      });
  }

  loadQueue(showSkeleton = true): void {
    if (showSkeleton) {
      this.loadingQueue.set(true);
    }

    this.api
      .queue()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.queue.set(res?.data ?? res ?? ({} as QueueCountsDto));
        },
        error: () => this.queue.set({} as QueueCountsDto),
        complete: () => this.loadingQueue.set(false),
      });
  }

  loadStatuses(): void {
    this.api
      .statuses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          const list: string[] = res?.data ?? [];
          this.statusOptions.set([
            { label: 'Todos', value: '' },
            ...list.map((s) => ({ label: this.prettyStatus(s), value: s })),
          ]);
        },
        error: () => this.statusOptions.set([{ label: 'Todos', value: '' }]),
      });
  }

  onSearchTyping(value: string): void {
    this.search$.next(value ?? '');
  }

  onFilterChange(): void {
    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.q.set('');
    this.status.set(null);
    this.deliveryType.set(null);
    this.paymentMethod.set(null);
    this.page.set(1);
    this.load();
  }

  onPageChange(event: any): void {
    this.page.set(Math.floor(event.first / event.rows) + 1);
    this.perPage.set(event.rows);
    this.load();
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

  statusSeverity(status: string): TagSeverity {
    if (status === 'pending') return 'warn';
    if (status === 'confirmed') return 'info';
    if (status === 'preparing') return 'warn';
    if (status === 'ready') return 'success';
    if (status === 'on_the_way') return 'info';
    if (status === 'delivered') return 'success';
    if (status === 'cancelled') return 'danger';
    return 'secondary';
  }

  ngOnDestroy(): void {
    this.realtime.stopOperatorOrders();
  }
}
