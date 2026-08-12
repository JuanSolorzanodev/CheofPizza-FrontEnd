import { DatePipe } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal,
} from '@angular/core';

import {
  OrderDto,
  OrderStatusChangeDto,
} from '../../../core/api/orders/checkout.models';

export interface CustomerOrderTimelineItem {
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
  selector:
    'app-customer-order-timeline',

  standalone:
    true,

  imports: [
    DatePipe,
  ],

  templateUrl:
    './customer-order-timeline.html',

  styleUrl:
    './customer-order-timeline.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CustomerOrderTimelineComponent
  implements OnDestroy
{
  private readonly terminalStatuses =
    new Set([
      'delivered',
      'canceled',
      'cancelled',
    ]);

  private clockId:
    ReturnType<
      typeof window.setInterval
    > |
    null = null;

  readonly order =
    input.required<OrderDto>();

  readonly now =
    signal(
      Date.now(),
    );

  readonly isFinalStatus =
    computed(
      () =>
        this.isTerminalStatus(
          this.order().status,
        ),
    );

  readonly timeline =
    computed<CustomerOrderTimelineItem[]>(
      () => {
        const order =
          this.order();

        const events = [
          ...(
            order.status_changes ??
            []
          ),
        ].sort(
          (
            first,
            second,
          ) =>
            new Date(
              first.changed_at,
            ).getTime() -
            new Date(
              second.changed_at,
            ).getTime(),
        );

        if (
          events.length ===
          0
        ) {
          return [];
        }

        const finalOrder =
          this.isTerminalStatus(
            order.status,
          );

        const currentTime =
          this.now();

        return events.map(
          (
            event,
            index,
          ) => {
            const status =
              this.eventStatus(
                event,
              );

            const currentAt =
              new Date(
                event.changed_at,
              ).getTime();

            const next =
              events[
                index + 1
              ];

            const isLast =
              index ===
              events.length -
                1;

            let durationLabel:
              string |
              null = null;

            if (next) {
              durationLabel =
                this.formatDuration(
                  Math.max(
                    0,

                    new Date(
                      next.changed_at,
                    ).getTime() -
                      currentAt,
                  ),
                );
            } else if (
              !finalOrder
            ) {
              durationLabel =
                this.formatDuration(
                  Math.max(
                    0,
                    currentTime -
                      currentAt,
                  ),
                );
            }

            return {
              id:
                `${
                  event.id ??
                  index
                }` +
                `-${event.changed_at}` +
                `-${status}`,

              status,

              note:
                event.note
                  ?.trim() ||
                null,

              changedAt:
                event.changed_at,

              updatedByBusiness:
                Boolean(
                  event.changed_by,
                ),

              durationLabel,

              isCurrent:
                isLast &&
                !finalOrder,

              isFinal:
                isLast &&
                finalOrder,
            };
          },
        );
      },
    );

  constructor() {
    effect(
      () => {
        const currentOrder =
          this.order();

        this.syncClock(
          currentOrder,
        );
      },
    );
  }

  ngOnDestroy(): void {
    this.stopClock();
  }

  statusLabel(
    status:
      string |
      null |
      undefined,
  ): string {
    const normalized =
      this.normalize(
        status,
      );

    const labels:
      Record<
        string,
        string
      > = {
      pending:
        'Pendiente',

      confirmed:
        'Confirmado',

      preparing:
        'Preparando',

      ready:
        'Listo',

      on_the_way:
        'En camino',

      delivered:
        'Entregado',

      canceled:
        'Cancelado',

      cancelled:
        'Cancelado',
    };

    return (
      labels[
        normalized
      ] ??
      this.capitalize(
        normalized ||
          'Sin estado',
      )
    );
  }

  private eventStatus(
    event:
      OrderStatusChangeDto,
  ): string {
    return (
      event.to_status ??
      event.to ??
      'pending'
    );
  }

  private syncClock(
    order:
      OrderDto,
  ): void {
    this.stopClock();

    this.now.set(
      Date.now(),
    );

    if (
      this.isTerminalStatus(
        order.status,
      ) ||
      typeof window ===
        'undefined'
    ) {
      return;
    }

    this.clockId =
      window.setInterval(
        () =>
          this.now.set(
            Date.now(),
          ),

        30_000,
      );
  }

  private stopClock(): void {
    if (
      this.clockId !==
      null
    ) {
      window.clearInterval(
        this.clockId,
      );

      this.clockId =
        null;
    }
  }

  private isTerminalStatus(
    status:
      string |
      null |
      undefined,
  ): boolean {
    return this
      .terminalStatuses
      .has(
        this.normalize(
          status,
        ),
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

  private capitalize(
    value:
      string,
  ): string {
    return value
      .replaceAll(
        '_',
        ' ',
      )
      .replace(
        /\b\p{L}/gu,

        (
          letter,
        ) =>
          letter
            .toUpperCase(),
      );
  }

  private formatDuration(
    milliseconds:
      number,
  ): string {
    const totalMinutes =
      Math.round(
        milliseconds /
          60_000,
      );

    if (
      totalMinutes <
      1
    ) {
      return 'menos de 1 min';
    }

    if (
      totalMinutes <
      60
    ) {
      return `${totalMinutes} min`;
    }

    const hours =
      Math.floor(
        totalMinutes /
          60,
      );

    const minutes =
      totalMinutes %
      60;

    return (
      minutes ===
      0
        ? `${hours} h`
        : `${hours} h ${minutes} min`
    );
  }
}
