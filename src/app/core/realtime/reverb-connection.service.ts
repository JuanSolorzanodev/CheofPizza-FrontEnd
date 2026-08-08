import {
  Injectable,
  inject,
} from '@angular/core';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import {
  environment,
} from '../../../environments/environment';

import {
  AuthStore,
} from '../auth/auth.store';

@Injectable({
  providedIn: 'root',
})
export class ReverbConnectionService {
  private readonly authStore =
    inject(AuthStore);

  private pusherRegistered = false;

  create(): Echo<'reverb'> | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const token =
      this.authStore.token()?.trim();

    if (!token) {
      return null;
    }

    this.registerPusher();

    return new Echo({
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
        environment.reverb.scheme ===
        'https',

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
  }

  hasAuthenticationToken(): boolean {
    return Boolean(
      this.authStore.token()?.trim(),
    );
  }

  private registerPusher(): void {
    if (this.pusherRegistered) {
      return;
    }

    (
      window as typeof window & {
        Pusher?: typeof Pusher;
      }
    ).Pusher = Pusher;

    this.pusherRegistered = true;
  }
}
