import {
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  OrderDto,
  OrderStatusCode,
} from '../../../core/api/orders/checkout.models';

@Component({
  selector:
    'app-customer-order-history-card',

  standalone:
    true,

  imports: [
    CurrencyPipe,
  ],

  templateUrl:
    './customer-order-history-card.html',

  styleUrl:
    './customer-order-history-card.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CustomerOrderHistoryCardComponent {
  readonly order =
    input.required<OrderDto>();

  readonly openDetail =
    output<number>();

  readonly isCancelled =
    computed(
      () => {
        const status =
          this.normalizeStatus(
            this.order().status,
          );

        return (
          status ===
            'cancelled' ||
          status ===
            'canceled'
        );
      },
    );

  readonly statusLabel =
    computed(
      () => {
        if (
          this.isCancelled()
        ) {
          return 'Pedido cancelado';
        }

        return this.isPickup()
          ? 'Pedido retirado'
          : 'Pedido entregado';
      },
    );

  readonly statusIcon =
    computed(
      () =>
        this.isCancelled()
          ? 'pi pi-times'
          : 'pi pi-check',
    );

  readonly cardClass =
    computed(
      () =>
        this.isCancelled()
          ? 'history-card history-card--cancelled'
          : 'history-card history-card--delivered',
    );

  readonly relativeDate =
    computed(
      () =>
        this.relativeDateLabel(
          this.order()
            .ordered_at,
        ),
    );

  readonly deliveryLabel =
    computed(
      () =>
        this.isPickup()
          ? 'Retiro en el local'
          : 'Entrega a domicilio',
    );

  readonly deliveryIcon =
    computed(
      () =>
        this.isPickup()
          ? 'pi pi-shop'
          : 'pi pi-truck',
    );

  readonly paymentLabel =
    computed(
      () => {
        const normalized =
          this.normalize(
            this.order()
              .payment_method,
          );

        const labels:
          Record<
            string,
            string
          > = {
          transfer:
            'Transferencia',

          cash:
            'Efectivo',

          card:
            'Tarjeta',

          paypal:
            'PayPal',
        };

        return (
          labels[normalized] ??
          this.order()
            .payment_method ??
          'No especificado'
        );
      },
    );

  readonly paymentIcon =
    computed(
      () => {
        const normalized =
          this.normalize(
            this.order()
              .payment_method,
          );

        const icons:
          Record<
            string,
            string
          > = {
          transfer:
            'pi pi-building-columns',

          cash:
            'pi pi-money-bill',

          card:
            'pi pi-credit-card',

          paypal:
            'pi pi-wallet',
        };

        return (
          icons[normalized] ??
          'pi pi-wallet'
        );
      },
    );

  readonly address =
    computed(
      () =>
        this.order()
          .address
          ?.trim() ||
        'Dirección no registrada',
    );

  readonly reference =
    computed<string | null>(
      () =>
        this.order()
          .delivery_location
          ?.reference
          ?.trim() ||
        null,
    );

  readonly isDelivery =
    computed(
      () =>
        this.normalize(
          this.order()
            .delivery_type,
        ) ===
        'delivery',
    );

  onOpenDetail(): void {
    this.openDetail.emit(
      this.order().id,
    );
  }

  private isPickup(): boolean {
    return (
      this.normalize(
        this.order()
          .delivery_type,
      ) ===
      'pickup'
    );
  }

  private relativeDateLabel(
    value:
      string,
  ): string {
    const date =
      new Date(
        value,
      );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return 'Fecha no disponible';
    }

    const now =
      new Date();

    const today =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

    const orderDay =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );

    const differenceInDays =
      Math.round(
        (
          today.getTime() -
          orderDay.getTime()
        ) /
          86_400_000,
      );

    const time =
      new Intl.DateTimeFormat(
        'es-EC',
        {
          hour:
            '2-digit',

          minute:
            '2-digit',

          hour12:
            false,
        },
      ).format(
        date,
      );

    if (
      differenceInDays ===
      0
    ) {
      return `Hoy, ${time}`;
    }

    if (
      differenceInDays ===
      1
    ) {
      return `Ayer, ${time}`;
    }

    const formattedDate =
      new Intl.DateTimeFormat(
        'es-EC',
        {
          day:
            'numeric',

          month:
            'short',

          year:
            date.getFullYear() ===
            now.getFullYear()
              ? undefined
              : 'numeric',
        },
      )
        .format(
          date,
        )
        .replace(
          '.',
          '',
        );

    return `${formattedDate}, ${time}`;
  }

  private normalizeStatus(
    status:
      OrderStatusCode |
      string |
      null |
      undefined,
  ): string {
    return this.normalize(
      status,
    );
  }

  private normalize(
    value:
      string |
      null |
      undefined,
  ): string {
    return (
      value ??
      ''
    )
      .trim()
      .toLowerCase();
  }
}
