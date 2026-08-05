import {
  CommonModule,
} from '@angular/common';
import {
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
  FormsModule,
} from '@angular/forms';
import {
  Title,
} from '@angular/platform-browser';
import {
  ActivatedRoute,
  RouterModule,
} from '@angular/router';
import {
  finalize,
} from 'rxjs';

import {
  ButtonModule,
} from 'primeng/button';
import {
  CardModule,
} from 'primeng/card';
import {
  DialogModule,
} from 'primeng/dialog';
import {
  MessageModule,
} from 'primeng/message';
import {
  SkeletonModule,
} from 'primeng/skeleton';
import {
  TagModule,
} from 'primeng/tag';
import {
  TextareaModule,
} from 'primeng/textarea';

import {
  OperatorOrdersApiService,
} from '../../../core/api/operator/operator-orders-api.service';
import {
  OperatorPaymentReceiptsApiService,
} from '../../../core/api/operator/operator-payment-receipts-api.service';
import {
  KitchenItemDto,
  OperatorOrderDetailDto,
} from '../../../core/api/operator/operator-orders.models';
import {
  PaymentReceiptDto,
  PaymentReceiptStatus,
  paymentReceiptFileSize,
  paymentReceiptStatusLabel,
} from '../../../core/api/payments/payment-receipts/payment-receipt.models';
import {
  OperatorRealtimeService,
} from '../../../core/realtime/operator-realtime.service';

import {
  formatOperatorDate,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../operator-order-ui.utils';

type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | null
  | undefined;

type ButtonSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | 'help'
  | 'primary';

@Component({
  selector: 'app-operator-order-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TextareaModule,
    TagModule,
    SkeletonModule,
    MessageModule,
    DialogModule,
  ],
  templateUrl:
    './operator-order-detail-page.html',
  styleUrl:
    './operator-order-detail-page.scss',
})
export class OperatorOrderDetailPage
  implements OnDestroy
{
  private readonly api =
    inject(OperatorOrdersApiService);

  private readonly receiptApi =
    inject(
      OperatorPaymentReceiptsApiService,
    );

  private readonly route =
    inject(ActivatedRoute);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly realtime =
    inject(OperatorRealtimeService);

  private readonly documentTitle =
    inject(Title);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage =
    signal<string | null>(null);

  readonly successMessage =
    signal<string | null>(null);

  readonly order =
    signal<OperatorOrderDetailDto | null>(
      null,
    );

  readonly receiptLoading =
    signal(false);

  readonly receiptReviewing =
    signal(false);

  readonly receiptPreviewVisible =
    signal(false);

  readonly rejectionDialogVisible =
    signal(false);

  readonly receiptPreviewUrl =
    signal<string | null>(null);

  readonly receiptPreviewMime =
    signal<string | null>(null);

  readonly receiptError =
    signal<string | null>(null);

  readonly receiptSuccess =
    signal<string | null>(null);

  readonly orderId = computed(() =>
    Number(
      this.route.snapshot.paramMap.get(
        'orderId',
      ) ?? '0',
    ),
  );

  readonly backUrl = computed(() => {
    const configuredUrl =
      this.route.snapshot.data['backUrl'];

    return (
      typeof configuredUrl === 'string' &&
      configuredUrl.trim().length > 0
    )
      ? configuredUrl
      : '/operator/orders';
  });

  readonly allowedTransitions =
    computed(() => {
      return (
        this.order()?.allowed_transitions ??
        []
      );
    });

  readonly hasAvailableTransitions =
    computed(
      () =>
        this.allowedTransitions().length >
        0,
    );

  readonly paymentReceipt = computed(
    () =>
      this.order()?.payment_receipt ??
      null,
  );

  readonly isTransferOrder = computed(
    () =>
      this.order()?.payment_method ===
      'transfer',
  );

  readonly hasReceipt = computed(
    () => this.paymentReceipt() !== null,
  );

  readonly canReviewReceipt = computed(
    () =>
      this.paymentReceipt()?.status ===
        'pending' &&
      this.paymentReceipt()
        ?.file_available === true,
  );

  readonly previewIsPdf = computed(
    () =>
      this.receiptPreviewMime() ===
      'application/pdf',
  );

  readonly previewIsImage = computed(
    () =>
      this.receiptPreviewMime()?.startsWith(
        'image/',
      ) === true,
  );

  note = '';
  rejectionReason = '';

  constructor() {
    this.load();

    const orderId = this.orderId();

    this.realtime.listenOrder(
      orderId,
      (payload: unknown) => {
        const detail =
          this.extractOrderDetail(payload);

        if (
          detail !== null &&
          Number(detail.id) === orderId
        ) {
          this.order.set(detail);
          this.errorMessage.set(null);

          return;
        }

        this.load(false);
      },
    );
  }

  load(showSkeleton = true): void {
    if (showSkeleton) {
      this.loading.set(true);
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const orderId = this.orderId();

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      this.order.set(null);

      this.errorMessage.set(
        'El identificador del pedido no es válido.',
      );

      this.loading.set(false);

      return;
    }

    this.api
      .show(orderId)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const loadedOrder =
            response?.data ?? null;

          this.order.set(loadedOrder);
          this.note = '';

          if (loadedOrder) {
            this.documentTitle.setTitle(
              `Pedido #${loadedOrder.order_number} | Cheo' Pizza`,
            );
          }
        },

        error: (error) => {
          this.order.set(null);

          this.errorMessage.set(
            this.resolveErrorMessage(
              error,
              'No fue posible cargar el pedido.',
            ),
          );
        },
      });
  }

  changeStatus(
    destinationStatus: string,
  ): void {
    const currentOrder = this.order();

    if (
      currentOrder === null ||
      this.saving()
    ) {
      return;
    }

    if (
      !currentOrder.allowed_transitions.includes(
        destinationStatus,
      )
    ) {
      this.errorMessage.set(
        'La transición seleccionada ya no está disponible.',
      );

      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .updateStatus(
        currentOrder.id,
        destinationStatus,
        this.note.trim() || undefined,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const updatedOrder =
            response?.data ?? null;

          if (updatedOrder !== null) {
            this.order.set(updatedOrder);
          }

          this.note = '';

          this.successMessage.set(
            'El estado del pedido se actualizó correctamente.',
          );
        },

        error: (error) => {
          this.errorMessage.set(
            this.resolveErrorMessage(
              error,
              'No fue posible actualizar el estado del pedido.',
            ),
          );
        },
      });
  }

  openReceiptPreview(): void {
    const receipt =
      this.paymentReceipt();

    if (
      receipt === null ||
      !receipt.file_available ||
      this.receiptLoading()
    ) {
      return;
    }

    this.receiptLoading.set(true);
    this.receiptError.set(null);
    this.receiptSuccess.set(null);

    this.closeReceiptObjectUrl();

    this.receiptApi
      .file(receipt.uuid)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() => {
          this.receiptLoading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob || blob.size === 0) {
            this.receiptError.set(
              'El archivo del comprobante está vacío o no está disponible.',
            );

            return;
          }

          const mimeType =
            blob.type ||
            receipt.mime_type ||
            'application/octet-stream';

          const objectUrl =
            URL.createObjectURL(blob);

          this.receiptPreviewUrl.set(
            objectUrl,
          );

          this.receiptPreviewMime.set(
            mimeType,
          );

          this.receiptPreviewVisible.set(
            true,
          );
        },

        error: (error) => {
          this.receiptError.set(
            this.resolveReceiptErrorMessage(
              error,
              'No fue posible abrir el comprobante.',
            ),
          );
        },
      });
  }

  closeReceiptPreview(): void {
    this.receiptPreviewVisible.set(
      false,
    );

    this.closeReceiptObjectUrl();
  }

  approveReceipt(): void {
    const receipt =
      this.paymentReceipt();

    if (
      receipt === null ||
      receipt.status !== 'pending' ||
      this.receiptReviewing()
    ) {
      return;
    }

    this.receiptReviewing.set(true);
    this.receiptError.set(null);
    this.receiptSuccess.set(null);

    this.receiptApi
      .approve(receipt.uuid)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() => {
          this.receiptReviewing.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.replacePaymentReceipt(
            response.data,
          );

          this.receiptSuccess.set(
            'El comprobante fue aprobado correctamente.',
          );
        },

        error: (error) => {
          this.receiptError.set(
            this.resolveReceiptErrorMessage(
              error,
              'No fue posible aprobar el comprobante.',
            ),
          );
        },
      });
  }

  openRejectReceiptDialog(): void {
    const receipt =
      this.paymentReceipt();

    if (
      receipt === null ||
      receipt.status !== 'pending' ||
      this.receiptReviewing()
    ) {
      return;
    }

    this.rejectionReason = '';
    this.receiptError.set(null);
    this.receiptSuccess.set(null);

    this.rejectionDialogVisible.set(
      true,
    );
  }

  closeRejectReceiptDialog(): void {
    if (this.receiptReviewing()) {
      return;
    }

    this.rejectionDialogVisible.set(
      false,
    );

    this.rejectionReason = '';
  }

  rejectReceipt(): void {
    const receipt =
      this.paymentReceipt();

    const reason =
      this.rejectionReason.trim();

    if (
      receipt === null ||
      receipt.status !== 'pending' ||
      this.receiptReviewing()
    ) {
      return;
    }

    if (reason.length < 5) {
      this.receiptError.set(
        'El motivo debe tener al menos 5 caracteres.',
      );

      return;
    }

    if (reason.length > 500) {
      this.receiptError.set(
        'El motivo no puede superar los 500 caracteres.',
      );

      return;
    }

    this.receiptReviewing.set(true);
    this.receiptError.set(null);
    this.receiptSuccess.set(null);

    this.receiptApi
      .reject(
        receipt.uuid,
        reason,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() => {
          this.receiptReviewing.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.replacePaymentReceipt(
            response.data,
          );

          this.rejectionDialogVisible.set(
            false,
          );

          this.rejectionReason = '';

          this.receiptSuccess.set(
            'El comprobante fue rechazado y el motivo quedó registrado.',
          );
        },

        error: (error) => {
          this.receiptError.set(
            this.resolveReceiptErrorMessage(
              error,
              'No fue posible rechazar el comprobante.',
            ),
          );
        },
      });
  }

  receiptStatusLabel(
    status:
      | PaymentReceiptStatus
      | string
      | null
      | undefined,
  ): string {
    return paymentReceiptStatusLabel(
      status,
    );
  }

  receiptFileSize(
    bytes: number | null | undefined,
  ): string {
    return paymentReceiptFileSize(bytes);
  }

  receiptStatusSeverity(
    status:
      | PaymentReceiptStatus
      | string,
  ): TagSeverity {
    switch (status) {
      case 'pending':
        return 'warn';

      case 'approved':
        return 'success';

      case 'rejected':
        return 'danger';

      default:
        return 'secondary';
    }
  }

  isReceiptImage(
    receipt: PaymentReceiptDto,
  ): boolean {
    return receipt.mime_type.startsWith(
      'image/',
    );
  }

  isReceiptPdf(
    receipt: PaymentReceiptDto,
  ): boolean {
    return (
      receipt.mime_type ===
      'application/pdf'
    );
  }

  transitionLabel(
    status: string,
  ): string {
    switch (status) {
      case 'confirmed':
        return 'Confirmar pedido';

      case 'preparing':
        return 'Enviar a preparación';

      case 'ready':
        return 'Marcar como listo';

      case 'on_the_way':
        return 'Enviar a domicilio';

      case 'delivered':
        return 'Marcar como entregado';

      case 'cancelled':
        return 'Cancelar pedido';

      default:
        return this.prettyStatus(status);
    }
  }

  transitionIcon(
    status: string,
  ): string {
    switch (status) {
      case 'confirmed':
        return 'pi pi-check';

      case 'preparing':
        return 'pi pi-hourglass';

      case 'ready':
        return 'pi pi-check-circle';

      case 'on_the_way':
        return 'pi pi-truck';

      case 'delivered':
        return 'pi pi-verified';

      case 'cancelled':
        return 'pi pi-times';

      default:
        return 'pi pi-arrow-right';
    }
  }

  transitionSeverity(
    status: string,
  ): ButtonSeverity {
    switch (status) {
      case 'confirmed':
      case 'preparing':
      case 'on_the_way':
        return 'info';

      case 'ready':
      case 'delivered':
        return 'success';

      case 'cancelled':
        return 'danger';

      default:
        return 'secondary';
    }
  }

  openCustomerConfirmationWhatsApp(): void {
  const url = this.order()
    ?.customer_confirmation_whatsapp_url
    ?.trim();

  if (
    !url ||
    typeof window === 'undefined'
  ) {
    return;
  }

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );
}

  openDeliveryWhatsApp(): void {
    const url = this.order()
      ?.delivery_whatsapp_url
      ?.trim();

    if (
      !url ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  }

  openMaps(): void {
    const url = this.order()
      ?.delivery
      ?.maps_url
      ?.trim();

    if (
      !url ||
      typeof window === 'undefined'
    ) {
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer',
    );
  }

  itemMeta(
    item: KitchenItemDto,
  ): string {
    return [
      item.size_name,
      item.category_name,
    ]
      .filter(
        (
          value,
        ): value is string =>
          typeof value === 'string' &&
          value.trim().length > 0,
      )
      .join(' · ');
  }

  prettyStatus(
    status: string,
  ): string {
    return prettyOperatorStatus(status);
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

  trackItem = (
    _: number,
    item: KitchenItemDto,
  ): number => item.id;

  ingredientsLabel(
    list?: unknown,
  ): string {
    if (!list) {
      return '—';
    }

    if (typeof list === 'string') {
      const value = list.trim();

      return value.length > 0
        ? value
        : '—';
    }

    if (Array.isArray(list)) {
      if (list.length === 0) {
        return '—';
      }

      if (
        typeof list[0] === 'string'
      ) {
        return (
          (list as string[])
            .filter(Boolean)
            .join(', ') || '—'
        );
      }

      const names = (
        list as Array<
          Record<string, unknown>
        >
      )
        .map((item) => {
          return (
            item['name'] ??
            item['ingredient_name'] ??
            item['title'] ??
            item['label'] ??
            ''
          );
        })
        .filter(
          (
            value,
          ): value is string =>
            typeof value === 'string' &&
            value.trim().length > 0,
        );

      return names.length > 0
        ? names.join(', ')
        : '—';
    }

    return '—';
  }

  personalizationText(
    personalization: {
      applies_to?: string;
      extra_price?: number;
      action?: string;
      ingredient_name?: string;
    },
  ): string {
    const side =
      personalization.applies_to &&
      personalization.applies_to !==
        'ALL'
        ? ` (${personalization.applies_to})`
        : '';

    const price =
      personalization.extra_price
        ? ` +$${Number(
            personalization.extra_price,
          ).toFixed(2)}`
        : '';

    return `${personalization.action ?? ''}: ${
      personalization.ingredient_name ??
      ''
    }${side}${price}`.trim();
  }

  ngOnDestroy(): void {
    this.realtime.stopOrder(
      this.orderId(),
    );

    this.closeReceiptObjectUrl();
  }

  private replacePaymentReceipt(
    receipt: PaymentReceiptDto,
  ): void {
    this.order.update(
      (currentOrder) => {
        if (currentOrder === null) {
          return null;
        }

        return {
          ...currentOrder,
          payment_receipt: receipt,
        };
      },
    );
  }

  private closeReceiptObjectUrl(): void {
    const currentUrl =
      this.receiptPreviewUrl();

    if (
      currentUrl &&
      typeof URL !== 'undefined'
    ) {
      URL.revokeObjectURL(
        currentUrl,
      );
    }

    this.receiptPreviewUrl.set(null);
    this.receiptPreviewMime.set(null);
  }

  private extractOrderDetail(
    payload: unknown,
  ): OperatorOrderDetailDto | null {
    if (
      typeof payload !== 'object' ||
      payload === null
    ) {
      return null;
    }

    const realtimePayload =
      payload as {
        detail?: unknown;
        order?: unknown;
        data?: unknown;
      };

    const candidate =
      realtimePayload.detail ??
      realtimePayload.order ??
      realtimePayload.data ??
      null;

    if (
      typeof candidate !== 'object' ||
      candidate === null
    ) {
      return null;
    }

    const detail =
      candidate as Partial<OperatorOrderDetailDto>;

    if (
      typeof detail.id !== 'number' ||
      typeof detail.order_number !==
        'string' ||
      typeof detail.status !== 'string'
    ) {
      return null;
    }

    return detail as OperatorOrderDetailDto;
  }

  private resolveReceiptErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    const response = error as {
      error?:
        | {
            message?: string;
            errors?: Record<
              string,
              string[]
            >;
          }
        | Blob
        | string;
    };

    const body = response?.error;

    if (
      body &&
      typeof body === 'object' &&
      !(body instanceof Blob)
    ) {
      const validation =
        body.errors?.['reason']?.[0];

      return (
        validation ??
        body.message ??
        fallback
      );
    }

    return fallback;
  }

  private resolveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    const response = error as {
      error?: {
        message?: string;
        errors?: Record<
          string,
          string[]
        >;
      };
    };

    const validationMessage =
      response?.error?.errors?.[
        'to_status'
      ]?.[0];

    return (
      validationMessage ??
      response?.error?.message ??
      fallback
    );
  }
}
