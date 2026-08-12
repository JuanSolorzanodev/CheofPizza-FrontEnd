import { CommonModule, CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';

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

import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { finalize, forkJoin } from 'rxjs';

import { ButtonModule } from 'primeng/button';

import { CardModule } from 'primeng/card';

import { SkeletonModule } from 'primeng/skeleton';

import { TagModule } from 'primeng/tag';

import { CheckoutConfigApiService } from '../../../core/api/orders/checkout-config-api.service';

import { MyOrdersApiService } from '../../../core/api/orders/my-orders-api.service';
import { CustomerOrderUpdatedRealtimeEvent } from '../../../core/realtime/realtime.models';

import { OrderDto } from '../../../core/api/orders/checkout.models';

import { PaymentReceiptStatus } from '../../../core/api/payments/payment-receipts/payment-receipt.models';

import { CustomerOrderItemsComponent } from '../../../shared/components/customer-order-items/customer-order-items';

import { CustomerOrderTimelineComponent } from '../../../shared/components/customer-order-timeline/customer-order-timeline';

import { CustomerPaymentReceiptComponent } from '../../../shared/components/customer-payment-receipt/customer-payment-receipt';

import { CustomerRealtimeService } from '../../../core/realtime/customer-realtime.service';

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
  standalone: true,
  selector: 'app-my-order-detail-page',

  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    TagModule,
    ButtonModule,
    SkeletonModule,
    CurrencyPipe,
    DatePipe,
    CustomerOrderItemsComponent,
    CustomerOrderTimelineComponent,
    CustomerPaymentReceiptComponent,
  ],

  templateUrl: './my-order-detail-page.html',

  styleUrl: './my-order-detail-page.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrderDetailPage implements OnInit, OnDestroy {
  private readonly api = inject(MyOrdersApiService);

  private readonly checkoutConfigApi = inject(CheckoutConfigApiService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly realtime = inject(CustomerRealtimeService);

  private readonly document = inject(DOCUMENT);

  private currentOrderId: number | null = null;

  readonly loading = signal(true);

  readonly order = signal<OrderDto | null>(null);

  readonly copied = signal<'account' | 'holder' | null>(null);

  readonly receiptStatus = signal<PaymentReceiptStatus | null>(null);

  readonly receiptReloadVersion = signal(0);

  readonly totalItems = computed(() => {
    const currentOrder = this.order();

    if (!currentOrder) {
      return 0;
    }

    if (typeof currentOrder.items_count === 'number') {
      return currentOrder.items_count;
    }

    return (currentOrder.items ?? []).reduce(
      (total, item) => total + Number(item.quantity ?? 0),
      0,
    );
  });

  readonly isTransfer = computed(() => this.normalize(this.order()?.payment_method) === 'transfer');

  readonly isCard = computed(() => this.normalize(this.order()?.payment_method) === 'card');

  readonly isDelivery = computed(() => this.normalize(this.order()?.delivery_type) === 'delivery');

  readonly hasQrImage = computed(() => Boolean(this.order()?.transfer_account?.qr_image_url));

  readonly deliveryAddress = computed(
    () =>
      this.order()?.delivery_location?.formatted_address?.trim() ||
      this.order()?.address?.trim() ||
      'No registrada',
  );

  readonly deliveryReference = computed(
    () => this.order()?.delivery_location?.reference?.trim() || null,
  );

  readonly paymentStatus = computed(() => this.normalize(this.order()?.payment?.status));

  readonly paymentStatusLabel = computed(() => {
    if (this.isTransfer()) {
      switch (this.receiptStatus()) {
        case 'approved':
          return 'Comprobante aprobado';
        case 'pending':
          return 'En revisión';
        case 'rejected':
          return 'Comprobante rechazado';
        default:
          return 'Pendiente de comprobante';
      }
    }

    if (!this.isCard() && !this.order()?.payment) {
      return 'Pago al recibir';
    }

    const labels: Record<string, string> = {
      pending: 'Pendiente',

      approved: 'Aprobado',

      completed: 'Pagado',

      paid: 'Pagado',

      failed: 'Fallido',

      cancelled: 'Cancelado',

      canceled: 'Cancelado',

      refunded: 'Reembolsado',
    };

    return labels[this.paymentStatus()] ?? 'Sin información';
  });

  readonly paymentStatusSeverity = computed<TagSeverity>(() => {
    if (this.isTransfer()) {
      switch (this.receiptStatus()) {
        case 'approved':
          return 'success';
        case 'rejected':
          return 'danger';
        case 'pending':
          return 'warn';
        default:
          return 'secondary';
      }
    }

    switch (this.paymentStatus()) {
      case 'completed':
      case 'paid':
        return 'success';

      case 'approved':
        return 'info';

      case 'failed':
      case 'cancelled':
      case 'canceled':
        return 'danger';

      case 'refunded':
        return 'warn';

      default:
        return this.isCard() ? 'warn' : 'secondary';
    }
  });

  readonly paymentProviderLabel = computed(() => {
    const provider = this.normalize(this.order()?.payment?.provider);

    if (provider === 'paypal') {
      return 'PayPal';
    }

    return provider ? this.capitalize(provider) : null;
  });

  readonly paymentDate = computed(
    () => this.order()?.payment?.paid_at ?? this.order()?.payment?.approved_at ?? null,
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('orderId'));

    if (!Number.isInteger(id) || id <= 0) {
      void this.router.navigate(['/my/orders']);

      return;
    }

    this.currentOrderId = id;

    this.load(id);
    this.setupRealtime(id);
  }

  ngOnDestroy(): void {
    if (this.currentOrderId !== null) {
      this.realtime.stopOrder(this.currentOrderId);
    }
  }

  load(id: number): void {
    this.loading.set(true);

    forkJoin({
      order: this.api.show(id),

      config: this.checkoutConfigApi.getConfig(),
    })
      .pipe(
        finalize(() => this.loading.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ order, config }) => {
          this.setOrderData({
            ...order.data,

            transfer_account: order.data.transfer_account ?? config.data.transfer ?? null,
          });
        },

        error: () => void this.router.navigate(['/my/orders']),
      });
  }

  onReceiptStatusChange(status: PaymentReceiptStatus | null): void {
    this.receiptStatus.set(status);
  }

  back(): void {
    void this.router.navigate(['/my/orders']);
  }

  statusSeverity(status: string | null | undefined): TagSeverity {
    switch (this.normalize(status)) {
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

  statusLabel(status: string | null | undefined): string {
    const normalized = this.normalize(status);

    const labels: Record<string, string> = {
      pending: 'Pendiente',

      confirmed: 'Confirmado',

      preparing: 'Preparando',

      ready: 'Listo',

      on_the_way: 'En camino',

      delivered: 'Entregado',

      canceled: 'Cancelado',

      cancelled: 'Cancelado',
    };

    return labels[normalized] ?? this.capitalize(normalized || 'Sin estado');
  }

  paymentLabel(method: string | null | undefined): string {
    const labels: Record<string, string> = {
      transfer: 'Transferencia bancaria',

      cash: 'Efectivo',

      card: 'Tarjeta o PayPal',
    };

    const normalized = this.normalize(method);

    return labels[normalized] ?? this.capitalize(normalized);
  }

  deliveryTypeLabel(deliveryType: string | null | undefined): string {
    const labels: Record<string, string> = {
      pickup: 'Retiro en local',

      delivery: 'Entrega a domicilio',
    };

    const normalized = this.normalize(deliveryType);

    return labels[normalized] ?? this.capitalize(normalized);
  }

  openMaps(): void {
    this.openExternalUrl(this.order()?.delivery_location?.maps_url);
  }

  async copy(
    text: string | null | undefined,

    kind: 'account' | 'holder',
  ): Promise<void> {
    const value = text?.trim();

    if (!value) {
      return;
    }

    const windowRef = this.document.defaultView;

    if (!windowRef) {
      return;
    }

    try {
      await windowRef.navigator.clipboard.writeText(value);

      this.copied.set(kind);

      windowRef.setTimeout(() => this.copied.set(null), 1400);
    } catch {
      windowRef.prompt('Copia el texto:', value);
    }
  }

  private setupRealtime(orderId: number): void {
    this.realtime.listenOrder(orderId);

    this.realtime.orderUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event: CustomerOrderUpdatedRealtimeEvent) => {
        const incoming = event.order;

        if (incoming.id !== orderId) {
          return;
        }

        const current = this.order();

        this.setOrderData({
          ...(current ?? incoming),

          ...incoming,

          payment: incoming.payment ?? current?.payment ?? null,

          customer: incoming.customer ?? current?.customer ?? null,

          transfer_account: incoming.transfer_account ?? current?.transfer_account ?? null,

          payment_hint: incoming.payment_hint ?? current?.payment_hint ?? null,
        });

        if (this.isTransfer()) {
          this.receiptReloadVersion.update((version) => version + 1);
        }
      });
  }

  private setOrderData(order: OrderDto): void {
    this.order.set(order);
  }

  private openExternalUrl(url: string | null | undefined): void {
    const normalizedUrl = url?.trim();
    const windowRef = this.document.defaultView;

    if (!normalizedUrl || !windowRef) {
      return;
    }

    windowRef.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private capitalize(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }
}
