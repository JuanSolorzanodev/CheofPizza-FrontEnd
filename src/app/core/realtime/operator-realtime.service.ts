import { Injectable, NgZone, inject } from '@angular/core';

import Echo from 'laravel-echo';

import { Subject } from 'rxjs';

import { AppLoggerService } from '../logging/app-logger.service';

import { ReverbConnectionService } from './reverb-connection.service';

import {
  OperatorOrderCreatedRealtimeEvent,
  OperatorOrderRealtimeEvent,
  OperatorOrderStatusChangedRealtimeEvent,
} from './realtime.models';

import {
  parseOperatorOrderCreatedEvent,
  parseOperatorOrderStatusChangedEvent,
} from './realtime-payload.parser';

@Injectable({
  providedIn: 'root',
})
export class OperatorRealtimeService {
  private readonly connection = inject(ReverbConnectionService);

  private readonly zone = inject(NgZone);

  private readonly logger = inject(AppLoggerService);

  private echo: Echo<'reverb'> | null = null;

  private operatorOrdersBound = false;

  private currentOrderChannel: string | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly orderCreated$ = new Subject<OperatorOrderCreatedRealtimeEvent>();

  readonly orderStatusChanged$ = new Subject<OperatorOrderStatusChangedRealtimeEvent>();

  connect(): void {
    if (this.echo) {
      return;
    }

    this.echo = this.connection.create();

    if (!this.echo) {
      this.logger.warn('[operator-realtime] connection unavailable');
    }
  }

  ensureOperatorOrdersSubscription(): void {
    const subscribe = (): void => {
      if (!this.connection.hasAuthenticationToken()) {
        this.scheduleReconnect(subscribe, 500);

        return;
      }

      this.listenOperatorOrders();
    };

    subscribe();
  }

  listenOperatorOrders(): void {
    this.connect();

    if (!this.echo) {
      return;
    }

    if (this.operatorOrdersBound) {
      return;
    }

    const channelName = 'operator.orders';

    this.echo
      .private(channelName)
      .error((error: unknown) => {
        this.logger.error(`[operator-realtime] ${channelName}`, error);
      })
      .listen(
        '.operator.order.created',

        (payload: unknown) => {
          this.handleOrderCreated(payload);
        },
      )
      .listen(
        '.operator.order.status-changed',

        (payload: unknown) => {
          this.handleOrderStatusChanged(payload);
        },
      );

    this.operatorOrdersBound = true;
  }

  listenOrder(
    orderId: number,

    handler: (event: OperatorOrderRealtimeEvent) => void,
  ): void {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    this.connect();

    if (!this.echo) {
      return;
    }

    const channelName = `operator.orders.${orderId}`;

    if (this.currentOrderChannel === channelName) {
      return;
    }

    if (this.currentOrderChannel) {
      this.echo.leave(this.currentOrderChannel);
    }

    this.echo
      .private(channelName)
      .error((error: unknown) => {
        this.logger.error(`[operator-realtime] ${channelName}`, error);
      })
      .listen(
        '.operator.order.created',

        (payload: unknown) => {
          const event = parseOperatorOrderCreatedEvent(payload);

          if (!event) {
            this.logger.warn('[operator-realtime] invalid operator.order.created payload', payload);

            return;
          }

          this.zone.run(() => {
            handler(event);
          });
        },
      )
      .listen(
        '.operator.order.status-changed',

        (payload: unknown) => {
          const event = parseOperatorOrderStatusChangedEvent(payload);

          if (!event) {
            this.logger.warn(
              '[operator-realtime] invalid operator.order.status-changed payload',
              payload,
            );

            return;
          }

          this.zone.run(() => {
            handler(event);
          });
        },
      );

    this.currentOrderChannel = channelName;
  }

  stopOperatorOrders(): void {
    if (!this.echo) {
      return;
    }

    this.echo.leave('operator.orders');

    this.operatorOrdersBound = false;
  }

  stopOrder(orderId: number): void {
    if (!this.echo) {
      return;
    }

    const channelName = `operator.orders.${orderId}`;

    this.echo.leave(channelName);

    if (this.currentOrderChannel === channelName) {
      this.currentOrderChannel = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);

      this.reconnectTimer = null;
    }

    if (this.echo && this.currentOrderChannel) {
      this.echo.leave(this.currentOrderChannel);
    }

    if (this.echo && this.operatorOrdersBound) {
      this.echo.leave('operator.orders');
    }

    this.echo?.disconnect();

    this.echo = null;

    this.operatorOrdersBound = false;

    this.currentOrderChannel = null;
  }

  private handleOrderCreated(payload: unknown): void {
    const event = parseOperatorOrderCreatedEvent(payload);

    if (!event) {
      this.logger.warn('[operator-realtime] invalid operator.order.created payload', payload);

      return;
    }

    this.zone.run(() => {
      this.orderCreated$.next(event);
    });
  }

  private handleOrderStatusChanged(payload: unknown): void {
    const event = parseOperatorOrderStatusChangedEvent(payload);

    if (!event) {
      this.logger.warn(
        '[operator-realtime] invalid operator.order.status-changed payload',
        payload,
      );

      return;
    }

    this.zone.run(() => {
      this.orderStatusChanged$.next(event);
    });
  }

  private scheduleReconnect(callback: () => void, milliseconds = 1000): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      callback();
    }, milliseconds);
  }
}
