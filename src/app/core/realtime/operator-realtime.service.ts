import {
  Injectable,
  NgZone,
  inject,
} from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

@Injectable({
  providedIn: 'root',
})
export class OperatorRealtimeService {
  private readonly authStore =
    inject(AuthStore);

  private readonly zone =
    inject(NgZone);

  private echo: Echo<'reverb'> | null =
    null;

  private operatorOrdersBound = false;

  private currentOrderChannel:
    | string
    | null = null;

  private reconnectTimer:
    | ReturnType<typeof setTimeout>
    | null = null;

  readonly orderCreated$ =
    new Subject<unknown>();

  readonly orderStatusChanged$ =
    new Subject<unknown>();

  constructor() {
    if (typeof window !== 'undefined') {
      (
        window as typeof window & {
          Pusher?: typeof Pusher;
        }
      ).Pusher = Pusher;
    }
  }

  private getToken(): string | null {
    return this.authStore.token();
  }

  connect(): void {
    if (
      this.echo ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const token = this.getToken();

    if (!token) {
      console.warn(
        '[realtime] no token available yet',
      );

      return;
    }

    this.echo = new Echo({
      broadcaster: 'reverb',

      key:
        environment.reverb.appKey,

      wsHost:
        environment.reverb.host,

      wsPort:
        environment.reverb.port,

      wssPort:
        environment.reverb.port,

      forceTLS:
        environment.reverb.scheme
        === 'https',

      enabledTransports: [
        'ws',
        'wss',
      ],

      authEndpoint:
        environment.reverb.authEndpoint,

      auth: {
        headers: {
          Authorization:
            `Bearer ${token}`,

          Accept:
            'application/json',
        },
      },
    });

    console.log(
      '[realtime] echo initialized',
    );
  }

  ensureOperatorOrdersSubscription(): void {
    const subscribe = (): void => {
      const token = this.getToken();

      if (!token) {
        console.warn(
          '[realtime] waiting for token...',
        );

        this.scheduleReconnect(
          subscribe,
          500,
        );

        return;
      }

      this.listenOperatorOrders();
    };

    subscribe();
  }

  listenOperatorOrders(): void {
    this.connect();

    if (!this.echo) {
      console.warn(
        '[realtime] echo not ready',
      );

      return;
    }

    if (this.operatorOrdersBound) {
      return;
    }

    const channelName =
      'operator.orders';

    console.log(
      `[realtime] subscribing to private ${channelName}`,
    );

    this.echo
      .private(channelName)
      .subscribed(() => {
        console.log(
          `[realtime] subscribed to private ${channelName}`,
        );
      })
      .error((error: unknown) => {
        console.error(
          `[realtime] ${channelName} subscription error`,
          error,
        );
      })
      .listen(
        '.operator.order.created',
        (payload: unknown) => {
          this.zone.run(() => {
            this.orderCreated$.next(
              payload,
            );
          });
        },
      )
      .listen(
        '.operator.order.status-changed',
        (payload: unknown) => {
          this.zone.run(() => {
            this.orderStatusChanged$.next(
              payload,
            );
          });
        },
      );

    this.operatorOrdersBound = true;
  }

  listenOrder(
    orderId: number,
    handler: (
      payload: unknown,
    ) => void,
  ): void {
    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return;
    }

    this.connect();

    if (!this.echo) {
      console.warn(
        '[realtime] echo not ready for order channel',
      );

      return;
    }

    const channelName =
      `operator.orders.${orderId}`;

    if (
      this.currentOrderChannel
      === channelName
    ) {
      return;
    }

    if (this.currentOrderChannel) {
      this.echo.leave(
        this.currentOrderChannel,
      );
    }

    console.log(
      `[realtime] subscribing to private ${channelName}`,
    );

    this.echo
      .private(channelName)
      .subscribed(() => {
        console.log(
          `[realtime] subscribed to private ${channelName}`,
        );
      })
      .error((error: unknown) => {
        console.error(
          `[realtime] ${channelName} subscription error`,
          error,
        );
      })
      .listen(
        '.operator.order.created',
        (payload: unknown) => {
          this.zone.run(() => {
            handler(payload);
          });
        },
      )
      .listen(
        '.operator.order.status-changed',
        (payload: unknown) => {
          this.zone.run(() => {
            handler(payload);
          });
        },
      );

    this.currentOrderChannel =
      channelName;
  }

  stopOperatorOrders(): void {
    if (!this.echo) {
      return;
    }

    this.echo.leave(
      'operator.orders',
    );

    this.operatorOrdersBound = false;
  }

  stopOrder(
    orderId: number,
  ): void {
    if (!this.echo) {
      return;
    }

    const channelName =
      `operator.orders.${orderId}`;

    this.echo.leave(
      channelName,
    );

    if (
      this.currentOrderChannel
      === channelName
    ) {
      this.currentOrderChannel =
        null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(
        this.reconnectTimer,
      );

      this.reconnectTimer = null;
    }

    if (
      this.echo &&
      this.currentOrderChannel
    ) {
      this.echo.leave(
        this.currentOrderChannel,
      );
    }

    if (
      this.echo &&
      this.operatorOrdersBound
    ) {
      this.echo.leave(
        'operator.orders',
      );
    }

    this.echo?.disconnect();

    this.echo = null;
    this.operatorOrdersBound =
      false;

    this.currentOrderChannel =
      null;
  }

  private scheduleReconnect(
    callback: () => void,
    milliseconds = 1000,
  ): void {
    if (this.reconnectTimer) {
      clearTimeout(
        this.reconnectTimer,
      );
    }

    this.reconnectTimer =
      setTimeout(() => {
        this.reconnectTimer =
          null;

        callback();
      }, milliseconds);
  }
}
