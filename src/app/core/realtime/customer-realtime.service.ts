import { Injectable, NgZone, inject } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { Subject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';

@Injectable({ providedIn: 'root' })
export class CustomerRealtimeService {
  private readonly authStore = inject(AuthStore);
  private readonly zone = inject(NgZone);

  private echo: Echo<'reverb'> | null = null;
  private currentOrdersChannel: string | null = null;
  private currentOrderChannel: string | null = null;

  readonly orderUpdated$ = new Subject<any>();

  constructor() {
    (window as any).Pusher = Pusher;
  }

  private get token(): string | null {
    return this.authStore.token();
  }

  private connect(): void {
    if (this.echo) return;

    const token = this.token;
    if (!token) {
      console.warn('[customer-realtime] no token available');
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
  }

  listenOrders(userId: number): void {
    this.connect();
    if (!this.echo) return;

    const channelName = `private-customer.orders.${userId}`;

    if (this.currentOrdersChannel === channelName) return;

    if (this.currentOrdersChannel) {
      this.echo.leave(this.currentOrdersChannel);
    }

    this.echo
      .private(`customer.orders.${userId}`)
      .subscribed(() => console.log(`[customer-realtime] subscribed ${channelName}`))
      .error((error: any) => console.error(`[customer-realtime] ${channelName}`, error))
      .listen('.customer.order.updated', (payload: any) => {
        this.zone.run(() => this.orderUpdated$.next(payload));
      });

    this.currentOrdersChannel = channelName;
  }

  listenOrder(orderId: number): void {
    this.connect();
    if (!this.echo) return;

    const channelName = `private-customer.order.${orderId}`;

    if (this.currentOrderChannel === channelName) return;

    if (this.currentOrderChannel) {
      this.echo.leave(this.currentOrderChannel);
    }

    this.echo
      .private(`customer.order.${orderId}`)
      .subscribed(() => console.log(`[customer-realtime] subscribed ${channelName}`))
      .error((error: any) => console.error(`[customer-realtime] ${channelName}`, error))
      .listen('.customer.order.updated', (payload: any) => {
        this.zone.run(() => this.orderUpdated$.next(payload));
      });

    this.currentOrderChannel = channelName;
  }

  stopOrders(userId: number): void {
    if (!this.echo) return;
    const channelName = `private-customer.orders.${userId}`;
    this.echo.leave(channelName);
    if (this.currentOrdersChannel === channelName) {
      this.currentOrdersChannel = null;
    }
  }

  stopOrder(orderId: number): void {
    if (!this.echo) return;
    const channelName = `private-customer.order.${orderId}`;
    this.echo.leave(channelName);
    if (this.currentOrderChannel === channelName) {
      this.currentOrderChannel = null;
    }
  }

  disconnect(): void {
    this.echo?.disconnect();
    this.echo = null;
    this.currentOrdersChannel = null;
    this.currentOrderChannel = null;
  }
}
