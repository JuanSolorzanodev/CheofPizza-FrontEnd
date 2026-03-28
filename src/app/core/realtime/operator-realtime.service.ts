import { Injectable, NgZone, inject } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class OperatorRealtimeService {
  private readonly authStore = inject(AuthStore);
  private readonly zone = inject(NgZone);

  private echo: Echo<'reverb'> | null = null;
  private operatorOrdersBound = false;
  private currentOrderChannel: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  readonly orderCreated$ = new Subject<any>();
  readonly orderStatusChanged$ = new Subject<any>();

  constructor() {
    (window as any).Pusher = Pusher;
  }

  private getToken(): string | null {
    return this.authStore.token();
  }

  connect(): void {
    if (this.echo) return;

    const token = this.getToken();

    if (!token) {
      console.warn('[realtime] no token available yet');
      return;
    }

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: environment.reverb.appKey,
      wsHost: environment.reverb.host,
      wsPort: environment.reverb.port,
      wssPort: environment.reverb.port,
      forceTLS: environment.reverb.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: environment.reverb.authEndpoint,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    console.log('[realtime] echo initialized');
  }

  ensureOperatorOrdersSubscription(): void {
    const trySubscribe = () => {
      const token = this.getToken();

      if (!token) {
        console.warn('[realtime] waiting for token...');
        this.scheduleReconnect(trySubscribe, 500);
        return;
      }

      this.listenOperatorOrders();
    };

    trySubscribe();
  }

  private scheduleReconnect(callback: () => void, ms = 1000): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      callback();
    }, ms);
  }

  listenOperatorOrders(): void {
    this.connect();

    if (!this.echo) {
      console.warn('[realtime] echo not ready');
      return;
    }

    if (this.operatorOrdersBound) {
      console.log('[realtime] operator.orders already bound');
      return;
    }

    console.log('[realtime] subscribing to private operator.orders...');

    this.echo
      .private('operator.orders')
      .subscribed(() => {
        console.log('[realtime] subscribed to private operator.orders');
      })
      .error((error: any) => {
        console.error('[realtime] operator.orders subscription error', error);
      })
      .listen('.operator.order.created', (payload: any) => {
        console.log('[realtime] order.created', payload);

        this.zone.run(() => {
          this.orderCreated$.next(payload);
        });
      })
      .listen('.operator.order.status-changed', (payload: any) => {
        console.log('[realtime] order.status-changed', payload);

        this.zone.run(() => {
          this.orderStatusChanged$.next(payload);
        });
      });

    this.operatorOrdersBound = true;
  }

  listenOrder(orderId: number, handler: (payload: any) => void): void {
    this.connect();

    if (!this.echo) {
      console.warn('[realtime] echo not ready for order channel');
      return;
    }

    const nextChannel = `private-operator.orders.${orderId}`;

    if (this.currentOrderChannel && this.currentOrderChannel !== nextChannel) {
      this.echo.leave(this.currentOrderChannel);
    }

    console.log(`[realtime] subscribing to ${nextChannel}`);

    this.echo
      .private(`operator.orders.${orderId}`)
      .subscribed(() => {
        console.log(`[realtime] subscribed to ${nextChannel}`);
      })
      .error((error: any) => {
        console.error(`[realtime] ${nextChannel} subscription error`, error);
      })
      .listen('.operator.order.created', (payload: any) => {
        this.zone.run(() => handler(payload));
      })
      .listen('.operator.order.status-changed', (payload: any) => {
        this.zone.run(() => handler(payload));
      });

    this.currentOrderChannel = nextChannel;
  }

  stopOperatorOrders(): void {
    if (!this.echo) return;

    this.echo.leave('operator.orders');
    this.echo.leave('private-operator.orders');
    this.operatorOrdersBound = false;
  }

  stopOrder(orderId: number): void {
    if (!this.echo) return;

    const channel = `private-operator.orders.${orderId}`;
    this.echo.leave(channel);

    if (this.currentOrderChannel === channel) {
      this.currentOrderChannel = null;
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.echo?.disconnect();
    this.echo = null;
    this.operatorOrdersBound = false;
    this.currentOrderChannel = null;
  }
}
