import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser,
} from '@angular/common';

import { firstValueFrom } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import {
  PayPalCheckoutConfig,
} from '../../../core/api/orders/checkout-config-api.service';

import {
  CreatePayPalOrderRequest,
  PayPalApiErrorResponse,
  PayPalButtonsInstance,
  PayPalPaymentStatusDto,
} from '../../../core/api/payments/paypal/paypal.models';

import {
  PayPalApiService,
} from '../../../core/api/payments/paypal/paypal-api.service';

import {
  PayPalSdkLoaderService,
} from '../../../core/api/payments/paypal/paypal-sdk-loader.service';

interface StoredPayPalAttempt {
  version: 2;
  idempotencyKey: string;
  paymentId: string | null;
  paypalOrderId: string | null;
  payloadFingerprint: string;
  createdAt: string;
}

interface NormalizedPayPalError {
  code: string | null;
  action: string | null;
  recoverable: boolean;
  reference: string | null;
  message: string | null;
}

@Component({
  selector: 'app-paypal-button',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './paypal-button.html',
  styleUrl: './paypal-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayPalButtonComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  private static readonly STORAGE_KEY =
    'cheofpizza.paypal.checkout-attempt.v2';

  private static readonly LEGACY_STORAGE_KEY =
    'cheofpizza.paypal.checkout-attempt.v1';

  private static readonly ATTEMPT_MAX_AGE_MS =
    24 * 60 * 60 * 1000;

  private readonly paypalApi =
    inject(PayPalApiService);

  private readonly sdkLoader =
    inject(PayPalSdkLoaderService);

  private readonly messageService =
    inject(MessageService);

  private readonly platformId =
    inject(PLATFORM_ID);

  private readonly isBrowser =
    isPlatformBrowser(this.platformId);

  @ViewChild('paypalContainer')
  private paypalContainer?:
    ElementRef<HTMLDivElement>;

  @Input({
    required: true,
  })
  config!: PayPalCheckoutConfig;

  @Input({
    required: true,
  })
  payload!: CreatePayPalOrderRequest;

  /**
   * Debe cambiar cada vez que cambie cualquier dato económico
   * o estructural del carrito:
   *
   * - productos;
   * - pizzas;
   * - tamaños;
   * - cantidades;
   * - extras;
   * - promociones;
   * - subtotal;
   * - total.
   */
  @Input({
    required: true,
  })
  cartFingerprint!: string;

  @Input()
  disabled = false;

  @Output()
  readonly paymentCompleted =
    new EventEmitter<number>();

  readonly loadingSdk =
    signal(true);

  readonly processing =
    signal(false);

  readonly recovering =
    signal(false);

  readonly errorMessage =
    signal<string | null>(null);

  private viewInitialized = false;

  private buttonsInstance:
    PayPalButtonsInstance | null = null;

  private currentAttempt:
    StoredPayPalAttempt | null = null;

  private renderVersion = 0;

  /**
   * Cuando createOrder rechaza su promesa, el SDK también
   * ejecuta onError. Esta bandera evita mostrar dos mensajes.
   */
  private suppressNextSdkError = false;

  async ngAfterViewInit(): Promise<void> {
    this.viewInitialized = true;

    this.removeLegacyAttempt();

    await this.initializeAttempt();
    await this.renderButtons();
  }

  ngOnChanges(
    changes: SimpleChanges,
  ): void {
    if (!this.viewInitialized) {
      return;
    }

    if (
      changes['payload'] ||
      changes['cartFingerprint']
    ) {
      this.handleCheckoutChange();
    }

    if (
      changes['config'] ||
      changes['disabled']
    ) {
      void this.renderButtons();
    }
  }

  ngOnDestroy(): void {
    this.renderVersion++;

    if (this.buttonsInstance?.close) {
      void this.buttonsInstance.close();
    }

    this.buttonsInstance = null;
  }

  retry(): void {
    this.errorMessage.set(null);

    this.resetAttemptForCurrentCheckout();

    void this.renderButtons();
  }

  private async initializeAttempt(): Promise<void> {
    if (
      !this.isBrowser ||
      !this.payload ||
      !this.cartFingerprint?.trim()
    ) {
      return;
    }

    const storedAttempt =
      this.readStoredAttempt();

    if (!storedAttempt) {
      this.currentAttempt =
        this.createNewAttempt();

      this.persistCurrentAttempt();

      return;
    }

    const currentFingerprint =
      this.createPayloadFingerprint();

    if (
      storedAttempt.payloadFingerprint !==
      currentFingerprint
    ) {
      this.resetAttemptForCurrentCheckout();

      return;
    }

    this.currentAttempt =
      storedAttempt;

    if (!storedAttempt.paymentId) {
      return;
    }

    await this.recoverPayment(
      storedAttempt.paymentId,
    );
  }

  private async recoverPayment(
    paymentId: string,
  ): Promise<void> {
    this.recovering.set(true);
    this.processing.set(true);
    this.errorMessage.set(null);

    try {
      const response =
        await firstValueFrom(
          this.paypalApi.getPaymentStatus(
            paymentId,
          ),
        );

      const payment =
        response?.data;

      if (!payment) {
        throw new Error(
          'Laravel no devolvió el estado del pago PayPal.',
        );
      }

      await this.handleRecoveredPayment(
        payment,
      );
    } catch (error: unknown) {
      if (this.isHttpStatus(error, 404)) {
        this.resetAttemptForCurrentCheckout();

        return;
      }

      if (this.isCartChangedError(error)) {
        this.resetAttemptForCurrentCheckout();

        return;
      }

      const message =
        this.resolveErrorMessage(
          error,
          'No fue posible recuperar el estado del pago anterior.',
        );

      this.errorMessage.set(message);

      this.messageService.add({
        severity: 'warn',
        summary:
          'No se pudo recuperar el pago',
        detail: message,
      });
    } finally {
      this.recovering.set(false);
      this.processing.set(false);
    }
  }

  private async handleRecoveredPayment(
    payment: PayPalPaymentStatusDto,
  ): Promise<void> {
    if (
      payment.status === 'completed' &&
      payment.order?.id
    ) {
      this.completeRecoveredPayment(
        payment,
      );

      return;
    }

    if (
      payment.status === 'pending' ||
      payment.status === 'approved' ||
      payment.status === 'created'
    ) {
      this.currentAttempt = {
        ...(
          this.currentAttempt ??
          this.createNewAttempt()
        ),

        paymentId:
          payment.payment_id,

        paypalOrderId:
          payment.paypal_order_id,
      };

      this.persistCurrentAttempt();

      if (
        payment.status === 'approved' &&
        payment.can_retry_capture
      ) {
        await this.tryCaptureRecoveredPayment(
          payment.payment_id,
        );
      }

      return;
    }

    /**
     * denied, failed, cancelled, refunded y
     * partially_refunded no deben reutilizarse.
     */
    this.resetAttemptForCurrentCheckout();
  }

  private completeRecoveredPayment(
    payment: PayPalPaymentStatusDto,
  ): void {
    const order = payment.order;

    if (!order?.id) {
      return;
    }

    this.clearStoredAttempt();

    this.messageService.add({
      severity: 'success',
      summary: 'Pago recuperado',
      detail:
        order.order_number
          ? `El pedido ${order.order_number} ya fue confirmado.`
          : 'El pago ya fue confirmado correctamente.',
    });

    this.paymentCompleted.emit(
      order.id,
    );
  }

  private async tryCaptureRecoveredPayment(
    paymentId: string,
  ): Promise<void> {
    try {
      const response =
        await firstValueFrom(
          this.paypalApi.captureOrder(
            paymentId,
          ),
        );

      const order =
        response?.data;

      if (!order?.id) {
        return;
      }

      this.clearStoredAttempt();

      this.messageService.add({
        severity: 'success',
        summary: 'Pago confirmado',
        detail:
          `Pedido ${order.order_number} creado correctamente.`,
      });

      this.paymentCompleted.emit(
        order.id,
      );
    } catch (error: unknown) {
      if (this.isCartChangedError(error)) {
        this.resetAttemptForCurrentCheckout();

        return;
      }

      const paypalError =
        this.extractPayPalError(error);

      if (
        paypalError.code ===
        'INSTRUMENT_DECLINED'
      ) {
        /**
         * No mostramos un error fatal durante la recuperación.
         * El usuario deberá volver a abrir PayPal para escoger
         * otra fuente de fondos.
         */
        this.errorMessage.set(null);

        return;
      }

      const message =
        this.resolveErrorMessage(
          error,
          'El pago sigue pendiente de confirmación.',
        );

      this.errorMessage.set(message);
    }
  }

  private handleCheckoutChange(): void {
    if (
      !this.isBrowser ||
      !this.payload ||
      !this.cartFingerprint?.trim()
    ) {
      return;
    }

    const nextFingerprint =
      this.createPayloadFingerprint();

    if (
      this.currentAttempt &&
      this.currentAttempt.payloadFingerprint ===
        nextFingerprint
    ) {
      return;
    }

    this.resetAttemptForCurrentCheckout();
  }

  private async renderButtons(): Promise<void> {
    const currentVersion =
      ++this.renderVersion;

    this.errorMessage.set(null);

    if (
      !this.isBrowser ||
      !this.paypalContainer?.nativeElement
    ) {
      return;
    }

    const container =
      this.paypalContainer.nativeElement;

    container.innerHTML = '';

    if (this.disabled) {
      this.loadingSdk.set(false);

      return;
    }

    if (!this.config?.enabled) {
      this.loadingSdk.set(false);

      this.errorMessage.set(
        'El pago con tarjeta no está disponible actualmente.',
      );

      return;
    }

    if (!this.config.client_id?.trim()) {
      this.loadingSdk.set(false);

      this.errorMessage.set(
        'No se recibió la configuración pública de PayPal.',
      );

      return;
    }

    if (!this.cartFingerprint?.trim()) {
      this.loadingSdk.set(false);

      this.errorMessage.set(
        'No se pudo identificar la versión actual del carrito.',
      );

      return;
    }

    this.loadingSdk.set(true);

    try {
      if (this.buttonsInstance?.close) {
        await this.buttonsInstance.close();
      }

      const paypal =
        await this.sdkLoader.load({
          clientId:
            this.config.client_id,

          currency:
            this.config.currency,

          locale:
            this.config.locale,
        });

      if (
        currentVersion !==
        this.renderVersion
      ) {
        return;
      }

      const buttons =
        paypal.Buttons({
          style: {
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
            height: 48,
            tagline: false,
          },

          createOrder:
            async (): Promise<string> => {
              this.validateBeforePayment();

              this.processing.set(true);
              this.errorMessage.set(null);

              try {
                const attempt =
                  this.ensureCurrentAttempt();

                /**
                 * Solo reutilizamos la orden cuando pertenece
                 * exactamente al mismo carrito y checkout.
                 */
                if (attempt.paypalOrderId) {
                  return attempt.paypalOrderId;
                }

                const response =
                  await firstValueFrom(
                    this.paypalApi.createOrder(
                      this.payload,
                      attempt.idempotencyKey,
                    ),
                  );

                const paypalOrderId =
                  response?.data
                    ?.paypal_order_id;

                const paymentId =
                  response?.data
                    ?.payment_id;

                if (
                  !paypalOrderId ||
                  !paymentId
                ) {
                  throw new Error(
                    'Laravel no devolvió los identificadores de la orden PayPal.',
                  );
                }

                this.currentAttempt = {
                  ...attempt,
                  paymentId,
                  paypalOrderId,
                };

                this.persistCurrentAttempt();

                return paypalOrderId;
              } catch (error: unknown) {
                if (
                  this.isCartChangedError(
                    error,
                  )
                ) {
                  this.resetAttemptForCurrentCheckout();

                  const message =
                    'El carrito cambió. Presiona nuevamente el botón para crear un pago actualizado.';

                  this.errorMessage.set(
                    message,
                  );

                  this.messageService.add({
                    severity: 'info',
                    summary:
                      'Pago actualizado',
                    detail: message,
                  });

                  this.suppressNextSdkError =
                    true;

                  throw error;
                }

                const message =
                  this.resolveErrorMessage(
                    error,
                    'No se pudo iniciar el pago.',
                  );

                this.errorMessage.set(
                  message,
                );

                this.messageService.add({
                  severity: 'error',
                  summary:
                    'No se pudo iniciar PayPal',
                  detail: message,
                });

                this.suppressNextSdkError =
                  true;

                throw error;
              } finally {
                this.processing.set(false);
              }
            },

          onApprove:
            async (
              _data,
              actions,
            ): Promise<void> => {
              this.processing.set(true);
              this.errorMessage.set(null);

              try {
                const paymentId =
                  this.currentAttempt
                    ?.paymentId;

                if (!paymentId) {
                  throw new Error(
                    'No se encontró el pago local asociado a PayPal.',
                  );
                }

                const response =
                  await firstValueFrom(
                    this.paypalApi.captureOrder(
                      paymentId,
                    ),
                  );

                const order =
                  response?.data;

                if (!order?.id) {
                  throw new Error(
                    'El pago fue procesado, pero Laravel no devolvió el pedido.',
                  );
                }

                this.clearStoredAttempt();

                this.messageService.add({
                  severity: 'success',
                  summary:
                    'Pago confirmado',
                  detail:
                    `Pedido ${order.order_number} creado correctamente.`,
                });

                this.paymentCompleted.emit(
                  order.id,
                );
              } catch (error: unknown) {
                if (
                  this.isCartChangedError(
                    error,
                  )
                ) {
                  this.resetAttemptForCurrentCheckout();

                  const message =
                    'El carrito cambió después de iniciar el pago. Se generará una operación nueva.';

                  this.errorMessage.set(
                    message,
                  );

                  this.messageService.add({
                    severity: 'warn',
                    summary:
                      'El carrito cambió',
                    detail: message,
                  });

                  return;
                }

                const paypalError =
                  this.extractPayPalError(
                    error,
                  );

                if (
                  paypalError.code ===
                    'INSTRUMENT_DECLINED' &&
                  paypalError.action ===
                    'RESTART_PAYMENT_SELECTION'
                ) {
                  /*
                   * No dejamos un error persistente en el componente,
                   * porque PayPal reabrirá inmediatamente el selector
                   * para que el comprador elija otra fuente de fondos.
                   */
                  this.errorMessage.set(null);

                  this.messageService.add({
                    severity: 'warn',
                    summary:
                      'Tarjeta rechazada',
                    detail:
                      'PayPal rechazó esta tarjeta. Selecciona otra tarjeta o inicia sesión con una cuenta compradora de PayPal Sandbox.',
                    life: 7000,
                  });

                  try {
                    await actions.restart();
                  } catch (
                    restartError: unknown
                  ) {
                    const restartMessage =
                      this.resolveErrorMessage(
                        restartError,
                        'No fue posible reiniciar el proceso de PayPal.',
                      );

                    this.errorMessage.set(
                      restartMessage,
                    );

                    this.messageService.add({
                      severity: 'error',
                      summary:
                        'No se pudo reiniciar PayPal',
                      detail:
                        restartMessage,
                    });
                  }

                  return;
                }

                const recovered =
                  await this.tryRecoverAfterCaptureError();

                if (recovered) {
                  return;
                }

                const message =
                  this.resolveErrorMessage(
                    error,
                    'No se pudo confirmar el pago.',
                  );

                this.errorMessage.set(
                  message,
                );

                this.messageService.add({
                  severity: 'error',
                  summary:
                    'Error al confirmar el pago',
                  detail: message,
                });

                /**
                 * No relanzamos el error. Relanzarlo vuelve
                 * a disparar onError y duplica el mensaje.
                 */
                return;
              } finally {
                this.processing.set(false);
              }
            },

          onCancel: (): void => {
            this.processing.set(false);

            this.messageService.add({
              severity: 'info',
              summary: 'Pago cancelado',
              detail:
                'No se realizó ningún cobro. Puedes intentarlo nuevamente.',
            });
          },

          onError:
            (error: unknown): void => {
              this.processing.set(false);

              if (
                this.suppressNextSdkError
              ) {
                this.suppressNextSdkError =
                  false;

                return;
              }

              const message =
                this.resolveErrorMessage(
                  error,
                  'PayPal no pudo completar la operación.',
                );

              this.errorMessage.set(
                message,
              );

              this.messageService.add({
                severity: 'error',
                summary:
                  'Error de PayPal',
                detail: message,
              });
            },
        });

      if (
        buttons.isEligible &&
        !buttons.isEligible()
      ) {
        this.loadingSdk.set(false);

        this.errorMessage.set(
          'PayPal no está disponible para este navegador o cuenta.',
        );

        return;
      }

      this.buttonsInstance =
        buttons;

      await buttons.render(
        container,
      );

      if (
        currentVersion !==
        this.renderVersion
      ) {
        if (buttons.close) {
          await buttons.close();
        }

        return;
      }

      this.loadingSdk.set(false);
    } catch (error: unknown) {
      if (
        currentVersion !==
        this.renderVersion
      ) {
        return;
      }

      this.loadingSdk.set(false);

      this.errorMessage.set(
        this.resolveErrorMessage(
          error,
          'No se pudo cargar el botón de PayPal.',
        ),
      );
    }
  }

  private async tryRecoverAfterCaptureError():
    Promise<boolean> {
    const paymentId =
      this.currentAttempt?.paymentId;

    if (!paymentId) {
      return false;
    }

    try {
      const response =
        await firstValueFrom(
          this.paypalApi.getPaymentStatus(
            paymentId,
          ),
        );

      const payment =
        response?.data;

      if (
        payment?.status ===
          'completed' &&
        payment.order?.id
      ) {
        this.clearStoredAttempt();

        this.messageService.add({
          severity: 'success',
          summary: 'Pago confirmado',
          detail:
            `Pedido ${payment.order.order_number} recuperado correctamente.`,
        });

        this.paymentCompleted.emit(
          payment.order.id,
        );

        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private validateBeforePayment(): void {
    if (this.disabled) {
      throw new Error(
        'El pago se encuentra temporalmente deshabilitado.',
      );
    }

    if (!this.payload) {
      throw new Error(
        'No se encontraron los datos del checkout.',
      );
    }

    if (!this.cartFingerprint?.trim()) {
      throw new Error(
        'No se pudo identificar la versión actual del carrito.',
      );
    }
  }

  private ensureCurrentAttempt():
    StoredPayPalAttempt {
    const fingerprint =
      this.createPayloadFingerprint();

    if (
      this.currentAttempt &&
      this.currentAttempt
        .payloadFingerprint ===
        fingerprint &&
      !this.isAttemptExpired(
        this.currentAttempt,
      )
    ) {
      return this.currentAttempt;
    }

    this.resetAttemptForCurrentCheckout();

    return this.currentAttempt!;
  }

  private createNewAttempt():
    StoredPayPalAttempt {
    return {
      version: 2,

      idempotencyKey:
        this.generateUuid(),

      paymentId: null,

      paypalOrderId: null,

      payloadFingerprint:
        this.createPayloadFingerprint(),

      createdAt:
        new Date().toISOString(),
    };
  }

  private readStoredAttempt():
    StoredPayPalAttempt | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const rawValue =
        sessionStorage.getItem(
          PayPalButtonComponent
            .STORAGE_KEY,
        );

      if (!rawValue) {
        return null;
      }

      const parsed =
        JSON.parse(
          rawValue,
        ) as Partial<StoredPayPalAttempt>;

      if (
        parsed.version !== 2 ||
        typeof parsed.idempotencyKey !==
          'string' ||
        typeof parsed.payloadFingerprint !==
          'string' ||
        typeof parsed.createdAt !==
          'string'
      ) {
        this.clearStoredAttempt();

        return null;
      }

      const attempt:
        StoredPayPalAttempt = {
          version: 2,

          idempotencyKey:
            parsed.idempotencyKey,

          paymentId:
            typeof parsed.paymentId ===
            'string'
              ? parsed.paymentId
              : null,

          paypalOrderId:
            typeof parsed.paypalOrderId ===
            'string'
              ? parsed.paypalOrderId
              : null,

          payloadFingerprint:
            parsed.payloadFingerprint,

          createdAt:
            parsed.createdAt,
        };

      if (
        this.isAttemptExpired(
          attempt,
        )
      ) {
        this.clearStoredAttempt();

        return null;
      }

      return attempt;
    } catch {
      this.clearStoredAttempt();

      return null;
    }
  }

  private persistCurrentAttempt(): void {
    if (
      !this.isBrowser ||
      !this.currentAttempt
    ) {
      return;
    }

    try {
      sessionStorage.setItem(
        PayPalButtonComponent.STORAGE_KEY,
        JSON.stringify(
          this.currentAttempt,
        ),
      );
    } catch {
      /**
       * El proceso sigue funcionando en memoria cuando
       * el navegador bloquea sessionStorage.
       */
    }
  }

  private clearStoredAttempt(): void {
    this.currentAttempt = null;

    if (!this.isBrowser) {
      return;
    }

    try {
      sessionStorage.removeItem(
        PayPalButtonComponent.STORAGE_KEY,
      );
    } catch {
      // No bloqueamos el pago por sessionStorage.
    }
  }

  private removeLegacyAttempt(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      sessionStorage.removeItem(
        PayPalButtonComponent
          .LEGACY_STORAGE_KEY,
      );
    } catch {
      // No bloqueamos el checkout.
    }
  }

  private resetAttemptForCurrentCheckout():
    void {
    this.clearStoredAttempt();

    this.currentAttempt =
      this.createNewAttempt();

    this.persistCurrentAttempt();
  }

  private isAttemptExpired(
    attempt: StoredPayPalAttempt,
  ): boolean {
    const createdAt =
      Date.parse(attempt.createdAt);

    if (
      !Number.isFinite(createdAt)
    ) {
      return true;
    }

    return (
      Date.now() - createdAt >
      PayPalButtonComponent
        .ATTEMPT_MAX_AGE_MS
    );
  }

  private createPayloadFingerprint():
    string {
    const normalizedPayload = {
      cart_fingerprint:
        this.cartFingerprint
          ?.trim() || null,

      delivery_type:
        this.payload
          ?.delivery_type ?? null,

      delivery_location:
        this.payload
          ?.delivery_location
          ? {
              lat:
                this.payload
                  .delivery_location
                  .lat,

              lng:
                this.payload
                  .delivery_location
                  .lng,
            }
          : null,

      address:
        this.payload
          ?.address
          ?.trim() || null,

      notes:
        this.payload
          ?.notes
          ?.trim() || null,
    };

    return JSON.stringify(
      normalizedPayload,
    );
  }

  private isCartChangedError(
    error: unknown,
  ): boolean {
    if (
      typeof error !== 'object' ||
      error === null
    ) {
      return false;
    }

    const httpError =
      error as {
        error?: PayPalApiErrorResponse;
      };

    const response =
      httpError.error;

    const code =
      response?.error?.code
        ?.toUpperCase() ?? '';

    if (
      code === 'CART_CHANGED' ||
      code ===
        'CART_FINGERPRINT_MISMATCH'
    ) {
      return true;
    }

    const messages = [
      response?.message,

      ...Object.values(
        response?.errors ?? {},
      ).flat(),
    ]
      .filter(
        (
          message,
        ): message is string =>
          typeof message === 'string',
      )
      .map(
        (message) =>
          message.toLowerCase(),
      );

    return messages.some(
      (message) =>
        message.includes(
          'el carrito cambió',
        ) ||
        message.includes(
          'el carrito cambio',
        ) ||
        message.includes(
          'nueva operación de pago',
        ),
    );
  }

  private extractPayPalError(
    error: unknown,
  ): NormalizedPayPalError {
    if (
      typeof error !== 'object' ||
      error === null
    ) {
      return {
        code: null,
        action: null,
        recoverable: false,
        reference: null,
        message: null,
      };
    }

    const httpError =
      error as {
        error?: PayPalApiErrorResponse;
        message?: string;
      };

    const response =
      httpError.error;

    return {
      code:
        response?.error?.code ??
        null,

      action:
        response?.error?.action ??
        null,

      recoverable:
        response?.error
          ?.recoverable ??
        false,

      reference:
        response?.error
          ?.reference ??
        null,

      message:
        response?.message ??
        httpError.message ??
        null,
    };
  }

  private resolveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    if (
      typeof error !== 'object' ||
      error === null
    ) {
      return fallback;
    }

    const httpError =
      error as {
        error?: PayPalApiErrorResponse;
        message?: string;
      };

    const validationErrors =
      httpError.error?.errors;

    if (validationErrors) {
      const firstValidationMessage =
        Object.values(
          validationErrors,
        )
          .flat()
          .find(
            (message) =>
              Boolean(message),
          );

      if (firstValidationMessage) {
        return firstValidationMessage;
      }
    }

    return (
      httpError.error?.message ||
      httpError.message ||
      fallback
    );
  }

  private isHttpStatus(
    error: unknown,
    status: number,
  ): boolean {
    if (
      typeof error !== 'object' ||
      error === null
    ) {
      return false;
    }

    return (
      (
        error as {
          status?: number;
        }
      ).status === status
    );
  }

  private generateUuid(): string {
    if (
      typeof crypto !==
        'undefined' &&
      typeof crypto.randomUUID ===
        'function'
    ) {
      return crypto.randomUUID();
    }

    return (
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
        .replace(
          /[xy]/g,
          (
            character: string,
          ) => {
            const random =
              Math.floor(
                Math.random() * 16,
              );

            const value =
              character === 'x'
                ? random
                : (
                    random & 0x3
                  ) | 0x8;

            return value.toString(
              16,
            );
          },
        )
    );
  }
}
