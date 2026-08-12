import {
  CurrencyPipe,
  DecimalPipe,
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

type StepKey =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered';

interface OrderStep {
  key: StepKey;
  label: string;
  shortLabel: string;
}

@Component({
  selector:
    'app-customer-active-order-card',

  standalone: true,

  imports: [
    CurrencyPipe,
    DecimalPipe,
  ],

  templateUrl:
    './customer-active-order-card.html',

  styleUrl:
    './customer-active-order-card.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CustomerActiveOrderCardComponent {
  readonly order =
    input.required<OrderDto>();

  readonly openDetail =
    output<number>();

  private readonly deliverySteps:
    readonly OrderStep[] = [
      {
        key: 'pending',
        label: 'Pedido recibido',
        shortLabel: 'Recibido',
      },
      {
        key: 'confirmed',
        label: 'Pedido confirmado',
        shortLabel: 'Confirmado',
      },
      {
        key: 'preparing',
        label: 'Pedido en preparación',
        shortLabel: 'Preparando',
      },
      {
        key: 'ready',
        label: 'Listo para entregar',
        shortLabel: 'Listo',
      },
      {
        key: 'on_the_way',
        label: 'Pedido en camino',
        shortLabel: 'En camino',
      },
      {
        key: 'delivered',
        label: 'Pedido entregado',
        shortLabel: 'Entregado',
      },
    ];

  private readonly pickupSteps:
    readonly OrderStep[] = [
      {
        key: 'pending',
        label: 'Pedido recibido',
        shortLabel: 'Recibido',
      },
      {
        key: 'confirmed',
        label: 'Pedido confirmado',
        shortLabel: 'Confirmado',
      },
      {
        key: 'preparing',
        label: 'Pedido en preparación',
        shortLabel: 'Preparando',
      },
      {
        key: 'ready',
        label: 'Listo para retirar',
        shortLabel: 'Listo',
      },
      {
        key: 'delivered',
        label: 'Pedido retirado',
        shortLabel: 'Retirado',
      },
    ];

  readonly steps =
    computed(
      () =>
        this.isPickup()
          ? this.pickupSteps
          : this.deliverySteps,
    );

  readonly currentStepIndex =
    computed(
      () => {
        const status =
          this.normalizeStatus(
            this.order().status,
          );

        const index =
          this.steps().findIndex(
            (step) =>
              step.key === status,
          );

        return Math.max(
          0,
          index,
        );
      },
    );

  readonly currentStepNumber =
    computed(
      () =>
        this.currentStepIndex() +
        1,
    );

  readonly progressPercentage =
    computed(
      () => {
        const total =
          this.steps().length;

        if (total <= 1) {
          return 100;
        }

        const progress =
          (
            this.currentStepIndex() /
            (total - 1)
          ) *
          100;

        return Math.max(
          0,
          Math.min(
            100,
            progress,
          ),
        );
      },
    );

  readonly nextStepLabel =
    computed<string | null>(
      () =>
        this.steps()[
          this.currentStepIndex() +
            1
        ]?.label ??
        null,
    );

  readonly statusLabel =
    computed(
      () => {
        const status =
          this.normalizeStatus(
            this.order().status,
          );

        const labels:
          Record<
            string,
            string
          > = {
          pending:
            'Pedido recibido',

          confirmed:
            'Pedido confirmado',

          preparing:
            'En preparación',

          ready:
            this.isPickup()
              ? 'Listo para retirar'
              : 'Listo para entregar',

          on_the_way:
            'En camino',

          delivered:
            this.isPickup()
              ? 'Pedido retirado'
              : 'Pedido entregado',
        };

        return (
          labels[status] ??
          'Estado no disponible'
        );
      },
    );

  readonly statusDescription =
    computed(
      () => {
        const status =
          this.normalizeStatus(
            this.order().status,
          );

        if (this.isPickup()) {
          const descriptions:
            Record<
              string,
              string
            > = {
            pending:
              'Recibimos tu pedido. En breve confirmaremos que toda la información esté correcta.',

            confirmed:
              'Tu pedido fue confirmado y pronto comenzaremos a prepararlo.',

            preparing:
              'Estamos preparando tu pedido con ingredientes frescos.',

            ready:
              'Tu pedido está listo. Puedes acercarte al local para retirarlo.',

            delivered:
              'El pedido fue retirado correctamente. ¡Buen provecho!',
          };

          return (
            descriptions[status] ??
            'Consulta el detalle para obtener más información.'
          );
        }

        const descriptions:
          Record<
            string,
            string
          > = {
          pending:
            'Recibimos tu pedido. En breve confirmaremos que toda la información esté correcta.',

          confirmed:
            'Tu pedido fue confirmado y pronto comenzaremos a prepararlo.',

          preparing:
            'Estamos preparando tu pedido con ingredientes frescos.',

          ready:
            'Tu pedido está listo y será asignado para la entrega.',

          on_the_way:
            'Tu pedido salió del local y se encuentra en camino.',

          delivered:
            'El pedido fue entregado correctamente. ¡Buen provecho!',
        };

        return (
          descriptions[status] ??
          'Consulta el detalle para obtener más información.'
        );
      },
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

  readonly statusClass =
    computed(
      () =>
        `order-status order-status--${this.normalizeStatus(
          this.order().status,
        )}`,
    );

  isPickup(): boolean {
    return (
      this.normalize(
        this.order()
          .delivery_type,
      ) ===
      'pickup'
    );
  }

  isDelivery(): boolean {
    return (
      this.normalize(
        this.order()
          .delivery_type,
      ) ===
      'delivery'
    );
  }

  isCurrentStep(
    step:
      StepKey,
  ): boolean {
    return (
      this.normalizeStatus(
        this.order().status,
      ) ===
      step
    );
  }

  isStepCompleted(
    step:
      StepKey,
  ): boolean {
    const index =
      this.steps().findIndex(
        (item) =>
          item.key === step,
      );

    return (
      index >= 0 &&
      index <=
        this.currentStepIndex()
    );
  }

  onOpenDetail(): void {
    this.openDetail.emit(
      this.order().id,
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
