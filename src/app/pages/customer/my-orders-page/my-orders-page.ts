import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '../../../core/auth/auth.store';
import { CustomerRealtimeService } from '../../../core/realtime/customer-realtime.service';

import { MyOrdersApiService } from '../../../core/api/orders/my-orders-api.service';
import { OrderDto } from '../../../core/api/orders/checkout.models';

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

type StepKey = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered';
type Step = { key: StepKey; label: string };

@Component({
  standalone: true,
  selector: 'app-my-orders-page',
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './my-orders-page.html',
  styleUrls: ['./my-orders-page.scss'], // ✅ IMPORTANTE (plural)
})
export class MyOrdersPage {
  private readonly api = inject(MyOrdersApiService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly loadingMore = signal(false);

  readonly orders = signal<OrderDto[]>([]);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authStore = inject(AuthStore);
  private readonly realtime = inject(CustomerRealtimeService);

  readonly hasMore = computed(() => this.orders().length < this.totalRecords());
  readonly skeletons = Array.from({ length: 5 });

  private readonly stepsDelivery: Step[] = [
    { key: 'pending', label: 'Pendiente' },
    { key: 'confirmed', label: 'Confirmado' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Listo' },
    { key: 'on_the_way', label: 'En camino' },
    { key: 'delivered', label: 'Entregado' },
  ];

  private readonly stepsPickup: Step[] = [
    { key: 'pending', label: 'Pendiente' },
    { key: 'confirmed', label: 'Confirmado' },
    { key: 'preparing', label: 'Preparando' },
    { key: 'ready', label: 'Listo para retirar' },
    { key: 'delivered', label: 'Retirado' },
  ];

  ngOnInit(): void {
    this.loadPage(1, false);
    this.setupRealtime();
  }

  private setupRealtime(): void {
  const user = this.authStore.user();
  if (!user?.id) return;

  this.realtime.listenOrders(user.id);

  this.realtime.orderUpdated$
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe((payload) => {
      const order = payload?.order as OrderDto | undefined;
      if (!order?.id) return;

      this.upsertOrder(order);
    });
}

  private upsertOrder(order: OrderDto): void {
    const current = [...this.orders()];
    const index = current.findIndex((x) => x.id === order.id);

    if (index >= 0) {
      current[index] = {
        ...current[index],
        ...order,
      };
    } else {
      current.unshift(order);
      this.totalRecords.update((v) => v + 1);
    }

    current.sort((a, b) => {
      const aDate = new Date(a.ordered_at).getTime();
      const bDate = new Date(b.ordered_at).getTime();
      return bDate - aDate;
    });

    this.orders.set(current);
  }

  refresh(): void {
    this.loadPage(1, false);
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadPage(this.page() + 1, true);
  }

  open(o: OrderDto): void {
    this.router.navigate(['/my/orders', o.id]);
  }

  visibleStepsFor(o: OrderDto): Step[] {
    return (o.delivery_type ?? '').toLowerCase() === 'pickup' ? this.stepsPickup : this.stepsDelivery;
  }

  stepDone(status: string, step: StepKey): boolean {
    const s = (status ?? '').toLowerCase();

    if (s === 'canceled' || s === 'cancelled') return false;

    const rank: Record<StepKey, number> = {
      pending: 1,
      confirmed: 2,
      preparing: 3,
      ready: 4,
      on_the_way: 5,
      delivered: 6,
    };

    const normalized = (Object.keys(rank) as StepKey[]).includes(s as StepKey)
      ? (s as StepKey)
      : 'pending';

    return rank[step] <= rank[normalized];
  }

  statusSeverity(status: string): TagSeverity {
    switch ((status ?? '').toLowerCase()) {
      case 'pending':
        return 'warn';
      case 'confirmed':
      case 'preparing':
      case 'ready':
      case 'on_the_way':
        return 'info';
      case 'delivered':
        return 'success';
      case 'canceled':
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      preparing: 'Preparando',
      ready: 'Listo',
      on_the_way: 'En camino',
      delivered: 'Entregado',
      canceled: 'Cancelado',
      cancelled: 'Cancelado',
    };
    return map[(status ?? '').toLowerCase()] ?? status;
  }

  paymentLabel(pm: string): string {
    const map: Record<string, string> = {
      transfer: 'Transferencia',
      cash: 'Efectivo',
      card: 'Tarjeta',
    };
    return map[(pm ?? '').toLowerCase()] ?? pm;
  }

  deliveryLabel(type: string): string {
    const t = (type ?? '').toLowerCase();
    if (t === 'delivery') return 'Delivery';
    if (t === 'pickup') return 'Retiro';
    return type;
  }

  private loadPage(page: number, append: boolean): void {
    if (!append) this.loading.set(true);
    else this.loadingMore.set(true);

    this.api
      .list(page)
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.loadingMore.set(false);
        })
      )
      .subscribe({
        next: (res: any) => {
          // soporta respuesta paginada o simple
          const rows: OrderDto[] = res?.data?.data ?? res?.data ?? [];
          const total = res?.data?.meta?.total ?? res?.meta?.total ?? rows.length;

          this.totalRecords.set(total);
          this.page.set(page);

          this.orders.set(append ? [...this.orders(), ...rows] : rows);
        },
        error: () => {
          if (!append) this.orders.set([]);
          this.totalRecords.set(0);
        },
      });
  }
}
