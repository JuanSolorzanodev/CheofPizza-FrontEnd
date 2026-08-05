import {
  ApplicationConfig,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import {
  registerLocaleData,
} from '@angular/common';

import localeEsEc from '@angular/common/locales/es-EC';

import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import {
  provideRouter,
} from '@angular/router';

import {
  MessageService,
} from 'primeng/api';

import {
  providePrimeNG,
} from 'primeng/config';

import {
  routes,
} from './app.routes';

import {
  cartSessionInterceptor,
} from './core/api/cart/cart-session.interceptor';

import {
  initializeAuthSession,
} from './core/auth/auth.initializer';

import {
  authInterceptor,
} from './core/auth/auth.interceptor';

import CheofPreset from './shared/ui/theme/cheof.preset';

/**
 * Registra los datos regionales de Ecuador para:
 *
 * - DatePipe
 * - CurrencyPipe
 * - DecimalPipe
 * - PercentPipe
 *
 * Esto permite utilizar el locale "es-EC" en toda la aplicación.
 */
registerLocaleData(localeEsEc);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    /**
     * Locale global de la aplicación.
     *
     * Los pipes de Angular utilizarán español de Ecuador
     * cuando no se especifique otro locale explícitamente.
     */
    {
      provide: LOCALE_ID,
      useValue: 'es-EC',
    },

    provideRouter(
      routes,
    ),

    provideHttpClient(
      withInterceptors([
        authInterceptor,
        cartSessionInterceptor,
      ]),
    ),

    provideAppInitializer(
      initializeAuthSession,
    ),

    MessageService,

    providePrimeNG({
      ripple: true,

      theme: {
        preset: CheofPreset,

        options: {
          prefix: 'p',

          darkModeSelector:
            '.cheof-dark',

          cssLayer: false,
        },
      },

      zIndex: {
        modal: 3000,
        overlay: 2000,
        menu: 2100,
        tooltip: 3200,
      },
    }),
  ],
};
