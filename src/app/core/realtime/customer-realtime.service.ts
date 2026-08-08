import {
  Injectable,
  NgZone,
  inject,
} from '@angular/core';

import Echo from 'laravel-echo';

import {
  Subject,
} from 'rxjs';

import {
  ReverbConnectionService,
} from './reverb-connection.service';

import {
  CustomerOrderUpdatedRealtimeEvent,
} from './realtime.models';

import {
  parseCustomerOrderUpdatedEvent,
} from './realtime-payload.parser';

@Injectable({
  providedIn: 'root',
})
export class CustomerRealtimeService {
  private readonly connection =
    inject(ReverbConnectionService);

  private readonly zone =
    inject(NgZone);

  private echo: Echo<'reverb'> | null =
    null;

  private currentOrdersChannel:
    | string
    | null = null;

  private currentOrderChannel:
    | string
    | null = null;

  readonly orderUpdated$ =
    new Subject<CustomerOrderUpdatedRealtimeEvent>();

  private connect(): void {
    if (this.echo) {
      return;
    }

    this.echo =
      this.connection.create();

    if (!this.echo) {
      console.warn(
        '[customer-realtime] connection unavailable',
      );
    }
  }

  listenOrders(
    userId: number,
  ): void {
    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return;
    }

    this.connect();

    if (!this.echo) {
      return;
    }

    const channelName =
      `customer.orders.${userId}`;

    if (
      this.currentOrdersChannel ===
      channelName
    ) {
      return;
    }

    if (this.currentOrdersChannel) {
      this.echo.leave(
        this.currentOrdersChannel,
      );
    }

    this.echo
      .private(channelName)
      .error((error: unknown) => {
        console.error(
          `[customer-realtime] ${channelName}`,
          error,
        );
      })
      .listen(
        '.customer.order.updated',

        (payload: unknown) => {
          this.handleOrderUpdated(
            payload,
          );
        },
      );

    this.currentOrdersChannel =
      channelName;
  }

  listenOrder(
    orderId: number,
  ): void {
    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return;
    }

    this.connect();

    if (!this.echo) {
      return;
    }

    const channelName =
      `customer.order.${orderId}`;

    if (
      this.currentOrderChannel ===
      channelName
    ) {
      return;
    }

    if (this.currentOrderChannel) {
      this.echo.leave(
        this.currentOrderChannel,
      );
    }

    this.echo
      .private(channelName)
      .error((error: unknown) => {
        console.error(
          `[customer-realtime] ${channelName}`,
          error,
        );
      })
      .listen(
        '.customer.order.updated',

        (payload: unknown) => {
          this.handleOrderUpdated(
            payload,
          );
        },
      );

    this.currentOrderChannel =
      channelName;
  }

  stopOrders(
    userId: number,
  ): void {
    if (!this.echo) {
      return;
    }

    const channelName =
      `customer.orders.${userId}`;

    this.echo.leave(
      channelName,
    );

    if (
      this.currentOrdersChannel ===
      channelName
    ) {
      this.currentOrdersChannel =
        null;
    }
  }

  stopOrder(
    orderId: number,
  ): void {
    if (!this.echo) {
      return;
    }

    const channelName =
      `customer.order.${orderId}`;

    this.echo.leave(
      channelName,
    );

    if (
      this.currentOrderChannel ===
      channelName
    ) {
      this.currentOrderChannel =
        null;
    }
  }

  disconnect(): void {
    if (
      this.echo &&
      this.currentOrdersChannel
    ) {
      this.echo.leave(
        this.currentOrdersChannel,
      );
    }

    if (
      this.echo &&
      this.currentOrderChannel
    ) {
      this.echo.leave(
        this.currentOrderChannel,
      );
    }

    this.echo?.disconnect();

    this.echo = null;

    this.currentOrdersChannel =
      null;

    this.currentOrderChannel =
      null;
  }

  private handleOrderUpdated(
    payload: unknown,
  ): void {
    const event =
      parseCustomerOrderUpdatedEvent(
        payload,
      );

    if (!event) {
      console.warn(
        '[customer-realtime] invalid customer.order.updated payload',
        payload,
      );

      return;
    }

    this.zone.run(() => {
      this.orderUpdated$.next(
        event,
      );
    });
  }
}
