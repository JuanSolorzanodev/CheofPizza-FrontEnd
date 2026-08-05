import {
  CommonModule,
  CurrencyPipe,
} from '@angular/common';

import {
  Component,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  toSignal,
} from '@angular/core/rxjs-interop';

import {
  AbstractControl,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import {
  Router,
  RouterModule,
} from '@angular/router';

import {
  finalize,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';

import {
  ButtonModule,
} from 'primeng/button';

import {
  InputNumberModule,
} from 'primeng/inputnumber';

import {
  RadioButtonModule,
} from 'primeng/radiobutton';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  TagModule,
} from 'primeng/tag';

import {
  TextareaModule,
} from 'primeng/textarea';

import {
  CartItemDto,
} from '../../../core/api/cart/cart.models';

import {
  CartStore,
} from '../../../core/api/cart/cart.store';

import {
  CheckoutApiService,
} from '../../../core/api/orders/checkout-api.service';

import {
  CheckoutConfig,
  CheckoutConfigApiService,
} from '../../../core/api/orders/checkout-config-api.service';

import {
  CheckoutRequestDto,
  DeliveryLocationDto,
  DeliveryTypeCode,
  OrderDto,
  PaymentMethodCode,
} from '../../../core/api/orders/checkout.models';

import {
  CreatePayPalOrderRequest,
} from '../../../core/api/payments/paypal/paypal.models';

import {
  AuthStore,
} from '../../../core/auth/auth.store';

import {
  GoogleLoginDialogComponent,
} from '../../../shared/components/google-login-dialog/google-login-dialog';

import {
  LocationPicker,
} from '../../../shared/components/location-picker/location-picker';

import {
  PayPalButtonComponent,
} from '../../../shared/components/paypal-button/paypal-button';

type StepId =
  | 0
  | 1
  | 2;

interface CheckoutStep {
  id: StepId;
  title: string;
  description: string;
  icon: string;
  active: boolean;
  done: boolean;
}

@Component({
  standalone: true,

  selector:
    'app-checkout-page',

  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    RadioButtonModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    GoogleLoginDialogComponent,
    LocationPicker,
    PayPalButtonComponent,
  ],

  templateUrl:
    './checkout-page.html',

  styleUrl:
    './checkout-page.scss',
})
export class CheckoutPage {
  readonly cart =
    inject(CartStore);

  readonly auth =
    inject(AuthStore);

  private readonly checkoutApi =
    inject(CheckoutApiService);

  private readonly checkoutConfigApi =
    inject(CheckoutConfigApiService);

  private readonly messageService =
    inject(MessageService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly router =
    inject(Router);

  @ViewChild(
    GoogleLoginDialogComponent,
  )
  loginDialog!:
    GoogleLoginDialogComponent;

  readonly activeStep =
    signal<StepId>(0);

  readonly placing =
    signal(false);

  readonly configLoading =
    signal(true);

  readonly checkoutConfig =
    signal<CheckoutConfig | null>(
      null,
    );

  readonly showManualAddress =
    signal(false);

  readonly form =
    this.formBuilder.group({
      delivery_type:
        this.formBuilder.control<DeliveryTypeCode>(
          'pickup',
          {
            nonNullable: true,

            validators: [
              Validators.required,
            ],
          },
        ),

      address:
        this.formBuilder.control(
          '',
          {
            nonNullable: true,

            validators: [
              this.optionalTextRangeValidator(
                10,
                500,
              ),
            ],
          },
        ),

      delivery_location:
        this.formBuilder.control<DeliveryLocationDto | null>(
          null,
        ),

      payment_method:
        this.formBuilder.control<PaymentMethodCode | null>(
          null,
          {
            validators: [
              Validators.required,
            ],
          },
        ),

      notes:
        this.formBuilder.control(
          '',
          {
            nonNullable: true,

            validators: [
              Validators.maxLength(
                500,
              ),
            ],
          },
        ),
    });

  readonly deliveryType =
    toSignal(
      this.form.controls
        .delivery_type
        .valueChanges,
      {
        initialValue:
          this.form.controls
            .delivery_type
            .value,
      },
    );

  readonly paymentMethod =
    toSignal(
      this.form.controls
        .payment_method
        .valueChanges,
      {
        initialValue:
          this.form.controls
            .payment_method
            .value,
      },
    );

  readonly addressText =
    toSignal(
      this.form.controls
        .address
        .valueChanges,
      {
        initialValue:
          this.form.controls
            .address
            .value,
      },
    );

  readonly deliveryLocation =
    toSignal(
      this.form.controls
        .delivery_location
        .valueChanges,
      {
        initialValue:
          this.form.controls
            .delivery_location
            .value,
      },
    );

  readonly hasItems =
    computed(
      () =>
        this.cart
          .items()
          .length > 0,
    );

  readonly isDelivery =
    computed(
      () =>
        this.deliveryType() ===
        'delivery',
    );

  readonly isTransfer =
    computed(
      () =>
        this.paymentMethod() ===
        'transfer',
    );

  readonly isCard =
    computed(
      () =>
        this.paymentMethod() ===
        'card',
    );

  readonly store =
    computed(
      () =>
        this.checkoutConfig()
          ?.store ??
        null,
    );

  readonly delivery =
    computed(
      () =>
        this.checkoutConfig()
          ?.delivery ??
        null,
    );

  readonly payments =
    computed(
      () =>
        this.checkoutConfig()
          ?.payments ??
        null,
    );

  readonly transferConfig =
    computed(
      () =>
        this.checkoutConfig()
          ?.transfer ??
        null,
    );

  readonly paypalConfig =
    computed(
      () =>
        this.checkoutConfig()
          ?.paypal ??
        null,
    );

  readonly storeAcceptsOrders =
    computed(
      () =>
        this.store()
          ?.accepts_orders ??
        false,
    );

  readonly pickupEnabled =
    computed(
      () =>
        this.delivery()
          ?.pickup_enabled ??
        false,
    );

  readonly deliveryEnabled =
    computed(
      () =>
        this.delivery()
          ?.delivery_enabled ??
        false,
    );

  readonly cashEnabled =
    computed(
      () =>
        this.payments()
          ?.cash_enabled ??
        false,
    );

  readonly transferEnabled =
    computed(
      () =>
        (
          this.payments()
            ?.transfer_enabled ??
          false
        ) &&
        this.transferConfig() !==
          null,
    );

  readonly paypalEnabled =
    computed(
      () =>
        (
          this.payments()
            ?.paypal_enabled ??
          false
        ) &&
        (
          this.paypalConfig()
            ?.enabled ??
          false
        ),
    );

  readonly subtotal =
    computed(
      () =>
        Number(
          this.cart.total() ??
          0,
        ),
    );

  readonly deliveryFee =
    computed(
      () =>
        this.isDelivery()
          ? Number(
              this.delivery()
                ?.delivery_fee ??
              0,
            )
          : 0,
    );

  readonly total =
    computed(
      () =>
        this.subtotal() +
        this.deliveryFee(),
    );

  readonly minimumOrder =
    computed(
      () =>
        Number(
          this.delivery()
            ?.minimum_order ??
          0,
        ),
    );

  readonly meetsMinimumOrder =
    computed(
      () =>
        this.subtotal() >=
        this.minimumOrder(),
    );

  readonly isOptionalAddressOk =
    computed(() => {
      if (
        !this.isDelivery()
      ) {
        return true;
      }

      const value =
        (
          this.addressText() ??
          ''
        ).trim();

      return (
        !value.length ||
        (
          value.length >= 10 &&
          value.length <= 500
        )
      );
    });

  readonly isLocationOk =
    computed(() => {
      if (
        !this.isDelivery()
      ) {
        return true;
      }

      const location =
        this.deliveryLocation();

      return Boolean(
        location &&
        Number.isFinite(
          location.lat,
        ) &&
        Number.isFinite(
          location.lng,
        ),
      );
    });

  readonly deliveryStepValid =
    computed(
      () =>
        this.isDelivery()
          ? this.deliveryEnabled() &&
            this.isLocationOk() &&
            this.isOptionalAddressOk()
          : this.pickupEnabled(),
    );

  readonly reviewStepValid =
    computed(
      () =>
        this.hasItems() &&
        this.meetsMinimumOrder(),
    );

  readonly paymentStepValid =
    computed(() => {
      const method =
        this.paymentMethod();

      if (
        method ===
        'cash'
      ) {
        return this.cashEnabled();
      }

      if (
        method ===
        'transfer'
      ) {
        return this.transferEnabled();
      }

      if (
        method ===
        'card'
      ) {
        return this.paypalEnabled();
      }

      return false;
    });

  readonly canProceed =
    computed(() => {
      if (
        this.configLoading() ||
        !this.storeAcceptsOrders()
      ) {
        return false;
      }

      if (
        this.activeStep() === 0
      ) {
        return this.deliveryStepValid();
      }

      if (
        this.activeStep() === 1
      ) {
        return this.reviewStepValid();
      }

      return (
        this.deliveryStepValid() &&
        this.reviewStepValid() &&
        this.paymentStepValid() &&
        this.auth.isAuthenticated() &&
        !this.placing()
      );
    });

  readonly steps =
    computed<CheckoutStep[]>(
      () => {
        const current =
          this.activeStep();

        return [
          {
            id: 0,

            title:
              'Entrega',

            description:
              'Modalidad y ubicación',

            icon:
              'pi pi-map-marker',

            active:
              current === 0,

            done:
              current > 0 &&
              this.deliveryStepValid(),
          },

          {
            id: 1,

            title:
              'Revisión',

            description:
              'Productos y observaciones',

            icon:
              'pi pi-shopping-bag',

            active:
              current === 1,

            done:
              current > 1 &&
              this.reviewStepValid(),
          },

          {
            id: 2,

            title:
              'Pago',

            description:
              'Método y confirmación',

            icon:
              'pi pi-credit-card',

            active:
              current === 2,

            done:
              false,
          },
        ];
      },
    );

  readonly selectedDeliveryLabel =
    computed(
      () =>
        this.isDelivery()
          ? 'Entrega a domicilio'
          : 'Retiro en el local',
    );

  readonly selectedPaymentLabel =
    computed(() => {
      switch (
        this.paymentMethod()
      ) {
        case 'cash':
          return 'Efectivo';

        case 'transfer':
          return (
            'Transferencia bancaria'
          );

        case 'card':
          return (
            'Tarjeta o PayPal'
          );

        default:
          return (
            'Pendiente de seleccionar'
          );
      }
    });

  readonly paypalCartFingerprint =
    computed(() => {
      const cart =
        this.cart.cart();

      if (!cart) {
        return '';
      }

      return JSON.stringify({
        id:
          cart.id,

        session_id:
          cart.session_id,

        total_units:
          cart.total_units,

        total:
          Number(
            cart.total,
          ),

        delivery_type:
          this.deliveryType(),

        delivery_fee:
          this.deliveryFee(),

        items: [
          ...cart.items,
        ]
          .sort(
            (
              left,
              right,
            ) =>
              left.id -
              right.id,
          )
          .map(
            item => ({
              id:
                item.id,

              item_type:
                item.item_type,

              promotion_id:
                item.promotion
                  ?.id ??
                null,

              pizza_id:
                item.pizza
                  ?.id ??
                null,

              pizza_second_id:
                item.pizza_second
                  ?.id ??
                null,

              selected_pizza_ids: [
                ...(
                  item.selected_pizzas ??
                  []
                ),
              ]
                .map(
                  pizza =>
                    pizza.id,
                )
                .sort(
                  (
                    left,
                    right,
                  ) =>
                    left -
                    right,
                ),

              size_id:
                item.size
                  ?.id ??
                null,

              quantity:
                item.quantity,

              unit_price:
                Number(
                  item.unit_price,
                ),

              subtotal:
                Number(
                  item.subtotal,
                ),

              extras: [
                ...(
                  item.extras ??
                  []
                ),
              ]
                .map(
                  extra => ({
                    ingredient_id:
                      extra
                        .ingredient
                        .id,

                    action_id:
                      extra
                        .action
                        .id,

                    applies_to:
                      extra
                        .applies_to,

                    extra_price:
                      Number(
                        extra
                          .extra_price,
                      ),
                  }),
                )
                .sort(
                  (
                    left,
                    right,
                  ) =>
                    `${
                      left.ingredient_id
                    }:${
                      left.action_id
                    }:${
                      left.applies_to
                    }`
                      .localeCompare(
                        `${
                          right.ingredient_id
                        }:${
                          right.action_id
                        }:${
                          right.applies_to
                        }`,
                      ),
                ),
            }),
          ),
      });
    });

  readonly paypalPayload =
    computed<CreatePayPalOrderRequest>(
      () => {
        const value =
          this.form.getRawValue();

        return {
          delivery_type:
            value.delivery_type,

          delivery_location:
            value.delivery_type ===
            'delivery'
              ? value.delivery_location
              : null,

          address:
            value.delivery_type ===
            'delivery'
              ? value.address
                    .trim() ||
                null
              : null,

          notes:
            value.notes
              .trim() ||
            null,
        };
      },
    );

  constructor() {
    this.cart.hydrate();

    this.loadCheckoutConfig();

    effect(() => {
      if (
        !this.isDelivery()
      ) {
        this.form.controls
          .delivery_location
          .setValue(
            null,
            {
              emitEvent: false,
            },
          );

        this.form.controls
          .address
          .setValue(
            '',
            {
              emitEvent: false,
            },
          );

        this.showManualAddress.set(
          false,
        );
      }
    });
  }

  openLogin(): void {
    this.loginDialog?.open();
  }

  selectDelivery(
    type: DeliveryTypeCode,
  ): void {
    if (
      type === 'pickup' &&
      !this.pickupEnabled()
    ) {
      return;
    }

    if (
      type === 'delivery' &&
      !this.deliveryEnabled()
    ) {
      return;
    }

    this.form.controls
      .delivery_type
      .setValue(
        type,
      );
  }

  selectPayment(
    method: PaymentMethodCode,
  ): void {
    if (
      method === 'cash' &&
      !this.cashEnabled()
    ) {
      return;
    }

    if (
      method === 'transfer' &&
      !this.transferEnabled()
    ) {
      return;
    }

    if (
      method === 'card' &&
      !this.paypalEnabled()
    ) {
      return;
    }

    this.form.controls
      .payment_method
      .setValue(
        method,
      );
  }

  goTo(
    step: StepId,
  ): void {
    if (
      step <
      this.activeStep()
    ) {
      this.activeStep.set(
        step,
      );
    }
  }

  prev(): void {
    this.activeStep.set(
      Math.max(
        0,
        this.activeStep() - 1,
      ) as StepId,
    );
  }

  next(): void {
    if (
      !this.validateCurrentStep()
    ) {
      return;
    }

    this.activeStep.set(
      Math.min(
        2,
        this.activeStep() + 1,
      ) as StepId,
    );
  }

  toggleManualAddress(): void {
    this.showManualAddress.update(
      value =>
        !value,
    );

    if (
      !this.showManualAddress()
    ) {
      this.form.controls
        .address
        .setValue(
          '',
        );
    }
  }

  continueShopping(): void {
    void this.router.navigate([
      '/',
    ]);
  }

  itemTitle(
    item: CartItemDto,
  ): string {
    if (
      item.item_type ===
      'promotion'
    ) {
      return (
        item.promotion
          ?.name ??
        'Promoción'
      );
    }

    if (
      item.is_half_and_half
    ) {
      return (
        `${
          item.pizza?.name ??
          'Pizza'
        } + ${
          item.pizza_second
            ?.name ??
          'Pizza'
        }`
      );
    }

    return (
      item.pizza?.name ??
      'Pizza'
    );
  }

  itemImage(
    item: CartItemDto,
  ): string {
    return (
      item.promotion
        ?.banner_image_url ||
      item.pizza
        ?.image_url ||
      item.pizza_second
        ?.image_url ||
      '/assets/images/pizza-placeholder.webp'
    );
  }

  confirm(): void {
    if (
      !this.validateCheckout()
    ) {
      return;
    }

    const value =
      this.form.getRawValue();

    if (
      value.payment_method ===
      'card'
    ) {
      return;
    }

    const payload:
      CheckoutRequestDto = {
      delivery_type:
        value.delivery_type,

      payment_method:
        value.payment_method!,

      delivery_location:
        value.delivery_type ===
        'delivery'
          ? value.delivery_location
          : null,

      address:
        value.delivery_type ===
        'delivery'
          ? value.address
                .trim() ||
            null
          : null,

      notes:
        value.notes
          .trim() ||
        null,
    };

    this.placing.set(
      true,
    );

    this.checkoutApi
      .checkout(
        payload,
      )
      .pipe(
        finalize(() => {
          this.placing.set(
            false,
          );
        }),
      )
      .subscribe({
        next: response => {
          this.handleOrderCreated(
            response.data,
          );
        },

        error: (
          error: unknown,
        ) => {
          this.messageService.add({
            severity:
              'error',

            summary:
              'No se pudo crear el pedido',

            detail:
              this.resolveErrorMessage(
                error,
                'No se pudo confirmar el pedido.',
              ),

            life:
              5000,
          });
        },
      });
  }

  /**
   * Se ejecuta desde el componente PayPal cuando el pago
   * fue capturado y el backend devolvió el pedido creado.
   *
   * El mensaje se muestra después de navegar para impedir
   * que desaparezca al destruirse el checkout.
   */
  readonly handlePayPalCompleted = (
    orderId: number,
  ): void => {
    if (
      !Number.isInteger(
        orderId,
      ) ||
      orderId <= 0
    ) {
      this.messageService.add({
        severity:
          'error',

        summary:
          'Pedido no disponible',

        detail:
          'El pago fue confirmado, pero no se recibió un pedido válido.',

        life:
          5000,
      });

      return;
    }

    this.cart.hydrate();

    void this.router
      .navigate([
        '/my/orders',
        orderId,
      ])
      .then(
        navigated => {
          if (!navigated) {
            this.messageService.add({
              severity:
                'warn',

              summary:
                'Pago confirmado',

              detail:
                `El pago del pedido #${orderId} fue aprobado, pero no pudimos abrir su detalle.`,

              life:
                6000,
            });

            return;
          }

          this.messageService.add({
            severity:
              'success',

            summary:
              'Pago y pedido confirmados',

            detail:
              `Tu pedido #${orderId} fue procesado correctamente.`,

            life:
              5000,
          });
        },
      );
  };

  /**
   * Maneja pedidos creados mediante efectivo o transferencia.
   *
   * Primero actualiza el carrito, luego navega al detalle
   * y finalmente muestra la confirmación global.
   */
  private handleOrderCreated(
    order: OrderDto,
  ): void {
    const orderId =
      Number(
        order.id,
      );

    if (
      !Number.isInteger(
        orderId,
      ) ||
      orderId <= 0
    ) {
      this.messageService.add({
        severity:
          'error',

        summary:
          'Pedido creado sin identificador',

        detail:
          'El pedido fue procesado, pero no se recibió un identificador válido.',

        life:
          5000,
      });

      return;
    }

    this.cart.hydrate();

    void this.router
      .navigate([
        '/my/orders',
        orderId,
      ])
      .then(
        navigated => {
          if (!navigated) {
            this.messageService.add({
              severity:
                'warn',

              summary:
                'Pedido confirmado',

              detail:
                `Tu pedido #${orderId} fue creado, pero no pudimos abrir su detalle.`,

              life:
                6000,
            });

            return;
          }

          this.messageService.add({
            severity:
              'success',

            summary:
              'Pedido confirmado',

            detail:
              `Tu pedido #${orderId} fue creado correctamente.`,

            life:
              5000,
          });
        },
      );
  }

  private loadCheckoutConfig(): void {
    this.configLoading.set(
      true,
    );

    this.checkoutConfigApi
      .getConfig()
      .pipe(
        finalize(() => {
          this.configLoading.set(
            false,
          );
        }),
      )
      .subscribe({
        next: ({
          data,
        }) => {
          this.checkoutConfig.set(
            data,
          );

          this.applyAvailableDefaults(
            data,
          );
        },

        error: (
          error: unknown,
        ) => {
          this.checkoutConfig.set(
            null,
          );

          this.messageService.add({
            severity:
              'error',

            summary:
              'Checkout no disponible',

            detail:
              this.resolveErrorMessage(
                error,
                'No se pudo cargar la configuración de la tienda.',
              ),

            life:
              5000,
          });
        },
      });
  }

  private applyAvailableDefaults(
    config: CheckoutConfig,
  ): void {
    const deliveryType =
      this.form.controls
        .delivery_type
        .value;

    if (
      deliveryType ===
        'pickup' &&
      !config.delivery
        .pickup_enabled
    ) {
      this.form.controls
        .delivery_type
        .setValue(
          'delivery',
        );
    } else if (
      deliveryType ===
        'delivery' &&
      !config.delivery
        .delivery_enabled
    ) {
      this.form.controls
        .delivery_type
        .setValue(
          'pickup',
        );
    }

    const method =
      this.form.controls
        .payment_method
        .value;

    const available =
      (
        method ===
          'cash' &&
        config.payments
          .cash_enabled
      ) ||
      (
        method ===
          'transfer' &&
        config.payments
          .transfer_enabled &&
        config.transfer !==
          null
      ) ||
      (
        method ===
          'card' &&
        config.payments
          .paypal_enabled &&
        config.paypal
          .enabled
      );

    if (!available) {
      this.form.controls
        .payment_method
        .setValue(
          null,
        );
    }
  }

  private validateCurrentStep():
    boolean {
    if (
      !this.storeAcceptsOrders()
    ) {
      return false;
    }

    if (
      this.activeStep() ===
        0 &&
      !this.deliveryStepValid()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Completa la entrega',

        detail:
          this.isDelivery()
            ? 'Selecciona una ubicación válida para continuar.'
            : 'La modalidad seleccionada no está disponible.',

        life:
          4500,
      });

      return false;
    }

    if (
      this.activeStep() ===
        1 &&
      !this.reviewStepValid()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Pedido mínimo no alcanzado',

        detail:
          `El subtotal mínimo es de $${this.minimumOrder().toFixed(2)}.`,

        life:
          4500,
      });

      return false;
    }

    return true;
  }

  private validateCheckout():
    boolean {
    if (
      !this.hasItems()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Carrito vacío',

        detail:
          'Agrega productos antes de pagar.',

        life:
          4500,
      });

      return false;
    }

    if (
      !this.storeAcceptsOrders()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Tienda cerrada',

        detail:
          this.store()
            ?.closed_message ||
          'La tienda no está recibiendo pedidos en este momento.',

        life:
          5000,
      });

      return false;
    }

    if (
      !this.deliveryStepValid()
    ) {
      this.activeStep.set(
        0,
      );

      return false;
    }

    if (
      !this.reviewStepValid()
    ) {
      this.activeStep.set(
        1,
      );

      return false;
    }

    if (
      !this.paymentStepValid()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Método de pago',

        detail:
          'Selecciona un método de pago disponible.',

        life:
          4500,
      });

      this.activeStep.set(
        2,
      );

      return false;
    }

    if (
      !this.auth.isAuthenticated()
    ) {
      this.openLogin();

      return false;
    }

    if (
      !this.form.valid
    ) {
      this.form.markAllAsTouched();

      return false;
    }

    return true;
  }

  private resolveErrorMessage(
    error: unknown,
    fallback: string,
  ): string {
    const parsed =
      error as {
        error?: {
          message?: string;

          errors?: Record<
            string,
            string[]
          >;
        };

        message?: string;
      };

    const validationMessage =
      Object.values(
        parsed.error
          ?.errors ??
        {},
      )
        .flat()
        .find(
          Boolean,
        );

    return (
      validationMessage ||
      parsed.error
        ?.message ||
      parsed.message ||
      fallback
    );
  }

  private optionalTextRangeValidator(
    min: number,
    max: number,
  ): ValidatorFn {
    return (
      control:
        AbstractControl<
          string | null
        >,
    ): ValidationErrors | null => {
      const value =
        (
          control.value ??
          ''
        ).trim();

      if (
        !value.length
      ) {
        return null;
      }

      if (
        value.length <
        min
      ) {
        return {
          minLengthOptional:
            true,
        };
      }

      if (
        value.length >
        max
      ) {
        return {
          maxLengthOptional:
            true,
        };
      }

      return null;
    };
  }
}
