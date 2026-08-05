import {
  DOCUMENT,
  isPlatformBrowser,
} from '@angular/common';

import {
  Injectable,
  PLATFORM_ID,
  inject,
} from '@angular/core';

import {
  PayPalNamespace,
} from './paypal.models';

export interface PayPalSdkOptions {
  clientId: string;
  currency: string;
  locale?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PayPalSdkLoaderService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private loadingPromise: Promise<PayPalNamespace> | null = null;
  private loadedSignature: string | null = null;

  load(
    options: PayPalSdkOptions,
  ): Promise<PayPalNamespace> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new Error(
          'El SDK de PayPal solo puede cargarse en el navegador.',
        ),
      );
    }

    const clientId = options.clientId.trim();

    const currency = (
      options.currency || 'USD'
    )
      .trim()
      .toUpperCase();

    if (!clientId) {
      return Promise.reject(
        new Error(
          'No se recibió el Client ID público de PayPal.',
        ),
      );
    }

    const signature = `${clientId}|${currency}`;

    if (
      window.paypal &&
      this.loadedSignature === signature
    ) {
      return Promise.resolve(window.paypal);
    }

    if (
      this.loadingPromise &&
      this.loadedSignature === signature
    ) {
      return this.loadingPromise;
    }

    this.removePreviousScript();

    this.loadedSignature = signature;

    this.loadingPromise =
      new Promise<PayPalNamespace>(
        (resolve, reject) => {
          const script =
            this.document.createElement('script');

          script.id = 'paypal-sdk-script';
          script.async = true;
          script.defer = true;

          /*
           * Primero usamos únicamente los parámetros esenciales.
           * No enviamos locale, enable-funding ni disable-funding.
           */
          const query = new URLSearchParams();

          query.set('client-id', clientId);
          query.set('currency', currency);
          query.set('intent', 'capture');
          query.set('components', 'buttons');

          script.src =
            `https://www.paypal.com/sdk/js?${query.toString()}`;

          script.dataset['source'] =
            'cheofpizza-checkout';

          script.onload = (): void => {
            if (!window.paypal) {
              this.resetLoadingState();

              reject(
                new Error(
                  'El script de PayPal respondió, pero no inicializó el SDK.',
                ),
              );

              return;
            }

            resolve(window.paypal);
          };

          script.onerror = (): void => {
            script.remove();

            this.resetLoadingState();

            reject(
              new Error(
                'No se pudo cargar el SDK de PayPal. Verifica que el Client ID pertenezca a una aplicación REST de PayPal Sandbox.',
              ),
            );
          };

          this.document.head.appendChild(script);
        },
      );

    return this.loadingPromise;
  }

  private removePreviousScript(): void {
    const currentScript =
      this.document.getElementById(
        'paypal-sdk-script',
      );

    currentScript?.remove();

    if (isPlatformBrowser(this.platformId)) {
      delete window.paypal;
    }

    this.loadingPromise = null;
  }

  private resetLoadingState(): void {
    this.loadingPromise = null;
    this.loadedSignature = null;
  }
}
