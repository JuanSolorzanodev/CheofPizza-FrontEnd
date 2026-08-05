import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { EMPTY, catchError, finalize, forkJoin } from 'rxjs';

import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { CardModule } from 'primeng/card';

import { ProgressBarModule } from 'primeng/progressbar';

import { SkeletonModule } from 'primeng/skeleton';

import { TagModule } from 'primeng/tag';

import { CheckoutConfigApiService } from '../../../core/api/orders/checkout-config-api.service';

import { MyOrdersApiService } from '../../../core/api/orders/my-orders-api.service';

import {
  OrderDto,
  OrderItemDto,
  OrderPersonalizationDto,
  OrderStatusChangeDto,
} from '../../../core/api/orders/checkout.models';

import { PaymentReceiptApiService } from '../../../core/api/payments/payment-receipts/payment-receipt-api.service';

import {
  PAYMENT_RECEIPT_ALLOWED_TYPES,
  PAYMENT_RECEIPT_MAX_SIZE,
  PaymentReceiptDto,
  PaymentReceiptStatus,
  PaymentReceiptValidationErrorResponse,
  paymentReceiptFileSize,
  paymentReceiptStatusLabel,
} from '../../../core/api/payments/payment-receipts/payment-receipt.models';

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

interface TimelineVM {
  id: string;
  status: string;
  note: string | null;
  changedAt: string;
  updatedByBusiness: boolean;
  durationLabel: string | null;
  isCurrent: boolean;
  isFinal: boolean;
}

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
    ProgressBarModule,
    CurrencyPipe,
    DatePipe,
  ],

  templateUrl: './my-order-detail-page.html',

  styleUrl: './my-order-detail-page.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyOrderDetailPage implements OnInit, OnDestroy {
  private readonly api = inject(MyOrdersApiService);

  private readonly checkoutConfigApi = inject(CheckoutConfigApiService);

  private readonly receiptApi = inject(PaymentReceiptApiService);

  private readonly route = inject(ActivatedRoute);

  private readonly router = inject(Router);

  private readonly destroyRef = inject(DestroyRef);

  private readonly realtime = inject(CustomerRealtimeService);

  private readonly messages = inject(MessageService);

  private readonly terminalStatuses = new Set(['delivered', 'canceled', 'cancelled']);

  private clockId: ReturnType<typeof window.setInterval> | null = null;

  private currentOrderId: number | null = null;

  private receiptObjectUrl: string | null = null;

  @ViewChild('receiptInput')
  private receiptInput?: ElementRef<HTMLInputElement>;

  readonly loading = signal(true);

  readonly order = signal<OrderDto | null>(null);

  readonly now = signal(Date.now());

  readonly copied = signal<'account' | 'holder' | null>(null);

  readonly receiptLoading = signal(false);

  readonly receiptUploading = signal(false);

  readonly receiptOpening = signal(false);

  readonly selectedReceiptFile = signal<File | null>(null);

  readonly paymentReceipt = signal<PaymentReceiptDto | null>(null);

  readonly receiptError = signal<string | null>(null);

  readonly uploadProgress = signal(0);

  readonly isTransfer = computed(() => this.normalize(this.order()?.payment_method) === 'transfer');

  readonly isCard = computed(() => this.normalize(this.order()?.payment_method) === 'card');

  readonly isDelivery = computed(() => this.normalize(this.order()?.delivery_type) === 'delivery');

  readonly isFinalStatus = computed(() => this.isTerminalStatus(this.order()?.status));

  readonly hasQrImage = computed(() => Boolean(this.order()?.transfer_account?.qr_image_url));

  readonly receiptStatus = computed<PaymentReceiptStatus | null>(
    () => this.paymentReceipt()?.status ?? null,
  );

  readonly receiptStatusLabel = computed(() => paymentReceiptStatusLabel(this.receiptStatus()));

  readonly receiptStatusSeverity = computed<TagSeverity>(() => {
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
  });

  readonly receiptCanUpload = computed(() => {
    if (!this.isTransfer() || this.receiptUploading()) {
      return false;
    }

    const status = this.receiptStatus();

    return status === null || status === 'rejected';
  });

  readonly receiptCanOpen = computed(() =>
    Boolean(this.paymentReceipt()?.file_available && this.paymentReceipt()?.uuid),
  );

  readonly receiptFileName = computed(
    () => this.selectedReceiptFile()?.name ?? this.paymentReceipt()?.original_name ?? null,
  );

  readonly receiptFileSize = computed(() => {
    const selected = this.selectedReceiptFile();

    if (selected) {
      return paymentReceiptFileSize(selected.size);
    }

    return paymentReceiptFileSize(this.paymentReceipt()?.file_size);
  });

  readonly receiptIsPdf = computed(() => this.paymentReceipt()?.mime_type === 'application/pdf');

  readonly totalItems = computed(() => {
    const order = this.order();

    if (typeof order?.items_count === 'number') {
      return order.items_count;
    }

    return (order?.items ?? []).reduce((total, item) => total + Number(item.quantity ?? 0), 0);
  });

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
      const receipt = this.paymentReceipt();

      if (receipt?.status === 'approved') {
        return 'Comprobante aprobado';
      }

      if (receipt?.status === 'pending') {
        return 'En revisión';
      }

      if (receipt?.status === 'rejected') {
        return 'Comprobante rechazado';
      }

      return 'Pendiente de comprobante';
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
      return this.receiptStatusSeverity();
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

  readonly timeline = computed<TimelineVM[]>(() => {
    const order = this.order();

    const events = [...(order?.status_changes ?? [])].sort(
      (first, second) =>
        new Date(first.changed_at).getTime() - new Date(second.changed_at).getTime(),
    );

    if (events.length === 0) {
      return [];
    }

    const finalOrder = this.isTerminalStatus(order?.status);

    const currentTime = this.now();

    return events.map((event, index) => {
      const status = this.eventStatus(event);

      const currentAt = new Date(event.changed_at).getTime();

      const next = events[index + 1];

      const isLast = index === events.length - 1;

      let durationLabel: string | null = null;

      if (next) {
        durationLabel = this.formatDuration(
          Math.max(0, new Date(next.changed_at).getTime() - currentAt),
        );
      } else if (!finalOrder) {
        durationLabel = this.formatDuration(Math.max(0, currentTime - currentAt));
      }

      return {
        id: `${event.id ?? index}` + `-${event.changed_at}` + `-${status}`,

        status,

        note: event.note?.trim() || null,

        changedAt: event.changed_at,

        updatedByBusiness: Boolean(event.changed_by),

        durationLabel,

        isCurrent: isLast && !finalOrder,

        isFinal: isLast && finalOrder,
      };
    });
  });

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
    this.stopClock();
    this.revokeReceiptUrl();

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

          if (this.normalize(order.data.payment_method) === 'transfer') {
            this.loadLatestReceipt(id);
          }
        },

        error: () => void this.router.navigate(['/my/orders']),
      });
  }

  loadLatestReceipt(orderId: number = this.currentOrderId ?? 0): void {
    if (orderId <= 0) {
      return;
    }

    this.receiptLoading.set(true);

    this.receiptError.set(null);

    this.receiptApi
      .latest(orderId)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.paymentReceipt.set(null);

            return EMPTY;
          }

          this.receiptError.set(this.errorMessage(error));

          return EMPTY;
        }),

        finalize(() => this.receiptLoading.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.paymentReceipt.set(response.data);

        this.selectedReceiptFile.set(null);

        this.clearReceiptInput();
      });
  }

  onReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0] ?? null;

    this.receiptError.set(null);

    if (!file) {
      this.selectedReceiptFile.set(null);

      return;
    }

    if (!PAYMENT_RECEIPT_ALLOWED_TYPES.has(file.type)) {
      this.rejectSelectedFile('Formato no permitido. Selecciona un archivo JPG, PNG, WebP o PDF.');

      return;
    }

    if (file.size > PAYMENT_RECEIPT_MAX_SIZE) {
      this.rejectSelectedFile('El archivo supera el límite máximo de 5 MB.');

      return;
    }

    if (file.size <= 0) {
      this.rejectSelectedFile('El archivo seleccionado está vacío.');

      return;
    }

    this.selectedReceiptFile.set(file);
  }

  removeSelectedReceipt(): void {
    if (this.receiptUploading()) {
      return;
    }

    this.selectedReceiptFile.set(null);

    this.receiptError.set(null);

    this.clearReceiptInput();
  }

  uploadReceipt(): void {
    const orderId = this.currentOrderId;

    const file = this.selectedReceiptFile();

    if (orderId === null || !file || !this.receiptCanUpload()) {
      return;
    }

    this.receiptUploading.set(true);

    this.receiptError.set(null);

    this.uploadProgress.set(35);

    this.receiptApi
      .upload(orderId, file)
      .pipe(
        finalize(() => {
          this.receiptUploading.set(false);

          this.uploadProgress.set(0);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.paymentReceipt.set(response.data);

          this.selectedReceiptFile.set(null);

          this.clearReceiptInput();

          this.messages.add({
            severity: 'success',

            summary: 'Comprobante enviado',

            detail: response.message || 'El comprobante fue enviado para revisión.',

            life: 3500,
          });
        },

        error: (error: HttpErrorResponse) => {
          const message = this.errorMessage(error);

          this.receiptError.set(message);

          this.messages.add({
            severity: 'error',

            summary: 'No se pudo enviar',

            detail: message,

            life: 5000,
          });
        },
      });
  }

  openReceipt(): void {
    const receipt = this.paymentReceipt();

    if (!receipt || !receipt.file_available || !receipt.uuid || this.receiptOpening()) {
      return;
    }

    this.receiptOpening.set(true);

    this.receiptError.set(null);

    this.receiptApi
      .file(receipt.uuid)
      .pipe(
        finalize(() => this.receiptOpening.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob) {
            this.receiptError.set('El servidor no devolvió el archivo.');

            return;
          }

          this.revokeReceiptUrl();

          this.receiptObjectUrl = URL.createObjectURL(blob);

          window.open(this.receiptObjectUrl, '_blank', 'noopener,noreferrer');
        },

        error: (error: HttpErrorResponse) => {
          const message = this.errorMessage(error);

          this.receiptError.set(message);

          this.messages.add({
            severity: 'error',

            summary: 'No se pudo abrir',

            detail: message,

            life: 4500,
          });
        },
      });
  }

  back(): void {
    void this.router.navigate(['/my/orders']);
  }

  receiptStatusText(status: PaymentReceiptStatus | string | null | undefined): string {
    return paymentReceiptStatusLabel(status);
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

  itemName(item: OrderItemDto): string {
    if (item.item_type === 'promotion') {
      return item.promotion?.name?.trim() || 'Promoción';
    }

    if (item.is_half_and_half) {
      return `${item.pizza?.name ?? 'Pizza'} / ` + `${item.pizza_second?.name ?? 'Pizza'}`;
    }

    return item.pizza?.name?.trim() || 'Pizza';
  }

  selectedPizzaNames(item: OrderItemDto): string[] {
    return (item.selected_pizzas ?? [])
      .map((selected) => selected.name ?? selected.pizza_name ?? '')
      .map((name) => name.trim())
      .filter(Boolean);
  }

  personalizationLabel(personalization: OrderPersonalizationDto): string {
    const action = personalization.action?.trim();

    const ingredient = personalization.ingredient_name?.trim();

    if (action && ingredient) {
      return `${action}: ` + ingredient;
    }

    return ingredient || action || 'Personalización';
  }

  personalizationTarget(personalization: OrderPersonalizationDto): string | null {
    const appliesTo = personalization.applies_to?.trim();

    if (!appliesTo) {
      return null;
    }

    const labels: Record<string, string> = {
      first: 'Primera mitad',

      second: 'Segunda mitad',

      whole: 'Pizza completa',

      promotion_item: 'Pizza de promoción',
    };

    return labels[this.normalize(appliesTo)] ?? appliesTo;
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

    try {
      await navigator.clipboard.writeText(value);

      this.copied.set(kind);

      window.setTimeout(() => this.copied.set(null), 1400);
    } catch {
      window.prompt('Copia el texto:', value);
    }
  }

  private setupRealtime(orderId: number): void {
    this.realtime.listenOrder(orderId);

    this.realtime.orderUpdated$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: unknown) => {
        const incoming = this.extractRealtimeOrder(payload);

        if (incoming?.id !== orderId) {
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
          this.loadLatestReceipt(orderId);
        }
      });
  }

  private extractRealtimeOrder(payload: unknown): OrderDto | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const source = payload as {
      order?: unknown;
      data?: unknown;
    };

    const candidate = source.order ?? source.data;

    if (typeof candidate !== 'object' || candidate === null) {
      return null;
    }

    const order = candidate as Partial<OrderDto>;

    return typeof order.id === 'number' ? (order as OrderDto) : null;
  }

  private eventStatus(event: OrderStatusChangeDto): string {
    return event.to_status ?? event.to ?? 'pending';
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

    this.clockId = window.setInterval(() => this.now.set(Date.now()), 30_000);
  }

  private stopClock(): void {
    if (this.clockId !== null) {
      window.clearInterval(this.clockId);

      this.clockId = null;
    }
  }

  private isTerminalStatus(status: string | null | undefined): boolean {
    return this.terminalStatuses.has(this.normalize(status));
  }

  private rejectSelectedFile(message: string): void {
    this.selectedReceiptFile.set(null);

    this.receiptError.set(message);

    this.clearReceiptInput();

    this.messages.add({
      severity: 'warn',

      summary: 'Archivo no válido',

      detail: message,

      life: 4200,
    });
  }

  private clearReceiptInput(): void {
    const input = this.receiptInput?.nativeElement;

    if (input) {
      input.value = '';
    }
  }

  private revokeReceiptUrl(): void {
    if (this.receiptObjectUrl) {
      URL.revokeObjectURL(this.receiptObjectUrl);

      this.receiptObjectUrl = null;
    }
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as PaymentReceiptValidationErrorResponse | Blob | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object' && !(body instanceof Blob)) {
      const firstError = Object.values(body.errors ?? {})
        .flat()
        .find(Boolean);

      if (firstError) {
        return firstError;
      }

      if (body.message) {
        return body.message;
      }
    }

    switch (error.status) {
      case 401:
        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';

      case 403:
        return 'No tienes permiso para acceder a este comprobante.';

      case 404:
        return 'El comprobante solicitado no está disponible.';

      case 413:
        return 'El archivo supera el tamaño permitido por el servidor.';

      case 422:
        return 'El archivo no cumple con las condiciones requeridas.';

      default:
        return error.message || 'Ocurrió un problema procesando la solicitud.';
    }
  }

  private openExternalUrl(url: string | null | undefined): void {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '').trim().toLowerCase();
  }

  private capitalize(value: string): string {
    return value.replaceAll('_', ' ').replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  }

  private formatDuration(milliseconds: number): string {
    const totalMinutes = Math.round(milliseconds / 60_000);

    if (totalMinutes < 1) {
      return 'menos de 1 min';
    }

    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);

    const minutes = totalMinutes % 60;

    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
  }

  openReceiptPicker(): void {
    if (this.receiptUploading() || !this.receiptCanUpload()) {
      return;
    }

    this.receiptInput?.nativeElement.click();
  }
}
