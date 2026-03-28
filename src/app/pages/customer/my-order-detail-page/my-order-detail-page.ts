import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { CustomerRealtimeService } from '../../../core/realtime/customer-realtime.service';
import { MyOrdersApiService } from '../../../core/api/orders/my-orders-api.service';
import { OrderDto, OrderItemDto, OrderStatusChangeDto } from '../../../core/api/orders/checkout.models';

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

type TimelineVM = OrderStatusChangeDto & {
  durationLabel?: string;
  durationPrefix?: string;
  isCurrent?: boolean;
  isFinal?: boolean;
  isLast?: boolean;
};

@Component({
  standalone: true,
  selector: 'app-my-order-detail-page',
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    TagModule,
    ButtonModule,
    DividerModule,
    TableModule,
    SkeletonModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './my-order-detail-page.html',
  styleUrls: ['./my-order-detail-page.scss'],
})
export class MyOrderDetailPage {
  private readonly api = inject(MyOrdersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(CustomerRealtimeService);

  private readonly finalStatuses = new Set(['delivered', 'canceled', 'cancelled']);
  private clockId: ReturnType<typeof window.setInterval> | null = null;
  private currentOrderId: number | null = null;

  readonly loading = signal(true);
  readonly order = signal<OrderDto | null>(null);
  readonly now = signal(Date.now());
  readonly copied = signal<'account' | 'holder' | null>(null);

  readonly isTransfer = computed(() => (this.order()?.payment_method ?? '').toLowerCase() === 'transfer');
  readonly isFinalStatus = computed(() => this.isTerminalStatus(this.order()?.status));
  readonly hasQrImage = computed(() => !!this.order()?.transfer_account?.qr_image_url);
  readonly shouldShowReceiptAction = computed(
    () => this.isTransfer() && !!this.order()?.whatsapp_receipt_url && !this.isFinalStatus(),
  );

  readonly totalItems = computed(() =>
    (this.order()?.items ?? []).reduce((acc, item) => acc + Number(item.quantity ?? 0), 0),
  );

  readonly deliveryAddress = computed(
    () => this.order()?.delivery_location?.formatted_address ?? this.order()?.address ?? 'No registrada',
  );

  readonly deliveryReference = computed(
    () => this.order()?.delivery_location?.reference?.trim() || null,
  );

  readonly paymentPanelTitle = computed(() => 'Resumen de pago');

  readonly transferPanelTitle = computed(() => {
    if (!this.isTransfer()) return '';
    return this.hasQrImage() ? 'Datos para transferir' : 'Cuenta para transferir';
  });

  readonly transferHelperText = computed(() => {
    const hint = this.order()?.payment_hint?.trim();
    if (hint) return hint;

    return 'Realiza la transferencia y envía el comprobante por WhatsApp para validar tu pedido.';
  });

  readonly lastStatusChangedAt = computed(() => this.timeline()[0]?.changed_at ?? null);

  readonly timeline = computed<TimelineVM[]>(() => {
    const order = this.order();
    const events = (order?.status_changes ?? [])
      .slice()
      .sort((a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime());

    if (events.length === 0) return [];

    const isFinal = this.isTerminalStatus(order?.status);
    const now = this.now();

    const out: TimelineVM[] = events.map((event, index) => {
      const currentAt = new Date(event.changed_at).getTime();
      const isLast = index === events.length - 1;
      const nextAt = !isLast ? new Date(events[index + 1].changed_at).getTime() : null;

      const vm: TimelineVM = {
        ...event,
        isCurrent: !isFinal && isLast,
        isFinal: isFinal && isLast,
        isLast,
      };

      if (nextAt !== null) {
        vm.durationPrefix = 'Duración';
        vm.durationLabel = this.formatDuration(Math.max(0, nextAt - currentAt));
      } else if (!isFinal) {
        vm.durationPrefix = 'Tiempo transcurrido';
        vm.durationLabel = this.formatDuration(Math.max(0, now - currentAt));
      }

      return vm;
    });

    return out.reverse();
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('orderId'));
    if (!Number.isFinite(id) || id <= 0) {
      this.router.navigate(['/my/orders']);
      return;
    }

    this.currentOrderId = id;
    this.load(id);
    this.setupRealtime(id);
  }

  ngOnDestroy(): void {
    this.stopClock();

    if (this.currentOrderId) {
      this.realtime.stopOrder(this.currentOrderId);
    }
  }

  private setupRealtime(orderId: number): void {
    this.realtime.listenOrder(orderId);

    this.realtime.orderUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload) => {
        const incoming = payload?.order as OrderDto | undefined;
        if (!incoming?.id || incoming.id !== orderId) return;

        const current = this.order();

        const merged: OrderDto = {
          ...(current ?? {}),
          ...incoming,
          transfer_account: incoming.transfer_account ?? current?.transfer_account ?? null,
          payment_hint: incoming.payment_hint ?? current?.payment_hint ?? null,
        } as OrderDto;

        this.setOrderData(merged);
      });
  }

  load(id: number): void {
    this.loading.set(true);
    this.api
      .show(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (res) => this.setOrderData(res.data),
        error: () => this.router.navigate(['/my/orders']),
      });
  }

  back(): void {
    this.router.navigate(['/my/orders']);
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
      transfer: 'Transferencia bancaria',
      cash: 'Efectivo',
      card: 'Tarjeta',
    };
    return map[(pm ?? '').toLowerCase()] ?? pm;
  }

  deliveryTypeLabel(deliveryType: string): string {
    const map: Record<string, string> = {
      pickup: 'Retiro en local',
      delivery: 'Delivery',
    };
    return map[(deliveryType ?? '').toLowerCase()] ?? deliveryType;
  }

  timelineTrackBy(index: number, event: TimelineVM): string {
    return `${event.to}-${event.changed_at}-${index}`;
  }

  itemName(item: OrderItemDto): string {
    if (!item.is_half_and_half) {
      return item.pizza?.name ?? 'Pizza';
    }

    return `${item.pizza?.name ?? 'Pizza'} / ${item.pizza_second?.name ?? 'Pizza'}`;
  }

  openWhatsApp(): void {
    const url = this.order()?.whatsapp_receipt_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  openMaps(): void {
    const url = this.order()?.delivery_location?.maps_url;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  async copy(text: string | null | undefined, kind: 'account' | 'holder'): Promise<void> {
    const safe = (text ?? '').toString().trim();
    if (!safe) return;

    try {
      await navigator.clipboard.writeText(safe);
      this.copied.set(kind);
      setTimeout(() => this.copied.set(null), 1200);
    } catch {
      window.prompt('Copia el texto:', safe);
    }
  }

  private setOrderData(order: OrderDto): void {
    this.order.set(order);
    this.syncClock(order);
  }

  private syncClock(order: OrderDto | null): void {
    this.stopClock();
    this.now.set(Date.now());

    if (!order || this.isTerminalStatus(order.status) || typeof window === 'undefined') {
      return;
    }

    this.clockId = window.setInterval(() => {
      this.now.set(Date.now());
    }, 30000);
  }

  private stopClock(): void {
    if (this.clockId !== null) {
      clearInterval(this.clockId);
      this.clockId = null;
    }
  }

  private isTerminalStatus(status: string | null | undefined): boolean {
    return this.finalStatuses.has((status ?? '').toLowerCase());
  }

  private formatDuration(ms: number): string {
    const totalMin = Math.round(ms / 60000);

    if (totalMin < 1) return 'menos de 1 min';
    if (totalMin < 60) return `${totalMin} min`;

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;

    return m === 0 ? `${h} h` : `${h} h ${m} min`;
  }
}
