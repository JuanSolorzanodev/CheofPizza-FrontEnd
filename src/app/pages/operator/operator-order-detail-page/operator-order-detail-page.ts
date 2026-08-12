import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, DestroyRef, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { OperatorOrdersApiService } from '../../../core/api/operator/operator-orders-api.service';
import { OperatorOrderDetailDto } from '../../../core/api/operator/operator-orders.models';
import { OperatorRealtimeService } from '../../../core/realtime/operator-realtime.service';
import { OperatorOrderRealtimeEvent } from '../../../core/realtime/realtime.models';
import { OperatorOrderHistory } from '../../../shared/components/operator-order-history/operator-order-history';
import { OperatorKitchenTicket } from '../../../shared/components/operator-kitchen-ticket/operator-kitchen-ticket';
import { OperatorPaymentReceiptReview } from '../../../shared/components/operator-payment-receipt-review/operator-payment-receipt-review';
import {
  formatOperatorDate,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../../../shared/ui/operator-order-ui.utils';

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
    OperatorOrderHistory,
    OperatorKitchenTicket,
    OperatorPaymentReceiptReview,
  ],
  templateUrl: './operator-order-detail-page.html',
  styleUrl: './operator-order-detail-page.scss',
})
export class OperatorOrderDetailPage implements OnDestroy {
  private readonly api = inject(OperatorOrdersApiService);

  private readonly route = inject(ActivatedRoute);

  private readonly destroyRef = inject(DestroyRef);

  private readonly realtime = inject(OperatorRealtimeService);

  private readonly documentTitle = inject(Title);

  private readonly document = inject(DOCUMENT);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly successMessage = signal<string | null>(null);

  readonly order = signal<OperatorOrderDetailDto | null>(null);

  readonly orderId = computed(() => Number(this.route.snapshot.paramMap.get('orderId') ?? '0'));

  readonly backUrl = computed(() => {
    const configuredUrl = this.route.snapshot.data['backUrl'];

    return typeof configuredUrl === 'string' && configuredUrl.trim().length > 0
      ? configuredUrl
      : '/operator/orders';
  });

  readonly allowedTransitions = computed(() => this.order()?.allowed_transitions ?? []);

  readonly hasAvailableTransitions = computed(() => this.allowedTransitions().length > 0);

  note = '';

  constructor() {
    this.load();

    const orderId = this.orderId();

    this.realtime.listenOrder(orderId, (event: OperatorOrderRealtimeEvent) => {
      const detail = event.detail ?? null;

      if (detail !== null && Number(detail.id) === orderId) {
        this.order.set(detail);

        this.errorMessage.set(null);

        return;
      }

      /*
       * Algunos eventos pueden no incluir el detalle
       * completo del pedido. En ese caso recuperamos
       * el estado canónico desde la API.
       */
      this.load(false);
    });
  }

  load(showSkeleton = true): void {
    if (showSkeleton) {
      this.loading.set(true);
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const orderId = this.orderId();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      this.order.set(null);

      this.errorMessage.set('El identificador del pedido no es válido.');

      this.loading.set(false);

      return;
    }

    this.api
      .show(orderId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const loadedOrder = response?.data ?? null;

          this.order.set(loadedOrder);
          this.note = '';

          if (loadedOrder) {
            this.documentTitle.setTitle(`Pedido #${loadedOrder.order_number} | Cheo' Pizza`);
          }
        },

        error: (error) => {
          this.order.set(null);

          this.errorMessage.set(
            this.resolveErrorMessage(error, 'No fue posible cargar el pedido.'),
          );
        },
      });
  }

  changeStatus(destinationStatus: string): void {
    const currentOrder = this.order();

    if (currentOrder === null || this.saving()) {
      return;
    }

    if (!currentOrder.allowed_transitions.includes(destinationStatus)) {
      this.errorMessage.set('La transición seleccionada ya no está disponible.');

      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .updateStatus(currentOrder.id, destinationStatus, this.note.trim() || undefined)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          const updatedOrder = response?.data ?? null;

          if (updatedOrder !== null) {
            this.order.set(updatedOrder);
          }

          this.note = '';

          this.successMessage.set('El estado del pedido se actualizó correctamente.');
        },

        error: (error) => {
          this.errorMessage.set(
            this.resolveErrorMessage(error, 'No fue posible actualizar el estado del pedido.'),
          );
        },
      });
  }

  onReceiptChange(
    receipt: import('../../../core/api/payments/payment-receipts/payment-receipt.models').PaymentReceiptDto,
  ): void {
    this.order.update((currentOrder) =>
      currentOrder ? { ...currentOrder, payment_receipt: receipt } : null,
    );
  }

  transitionLabel(status: string): string {
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

  transitionIcon(status: string): string {
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

  transitionSeverity(status: string): ButtonSeverity {
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
    this.openExternalUrl(this.order()?.customer_confirmation_whatsapp_url);
  }

  openDeliveryWhatsApp(): void {
    this.openExternalUrl(this.order()?.delivery_whatsapp_url);
  }

  openMaps(): void {
    this.openExternalUrl(this.order()?.delivery?.maps_url);
  }

  private openExternalUrl(url: string | null | undefined): void {
    const normalizedUrl = url?.trim();
    const windowRef = this.document.defaultView;

    if (!normalizedUrl || !windowRef) {
      return;
    }

    windowRef.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  prettyStatus(status: string): string {
    return prettyOperatorStatus(status);
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
    this.realtime.stopOrder(this.orderId());
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const response = error as {
      error?: {
        message?: string;
        errors?: Record<string, string[]>;
      };
    };

    const validationMessage = response?.error?.errors?.['to_status']?.[0];

    return validationMessage ?? response?.error?.message ?? fallback;
  }
}
