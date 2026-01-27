import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';

import { CheckoutApiService } from '../../../core/api/orders/checkout-api.service';
import { CheckoutConfigApiService, CheckoutConfigResponse } from '../../../core/api/orders/checkout-config-api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CartStore } from '../../../core/api/cart/cart.store';
import { GoogleLoginDialogComponent } from '../../../shared/components/google-login-dialog/google-login-dialog';

import {
  CheckoutRequestDto,
  DeliveryLocationDto,
  DeliveryTypeCode,
  OrderDto,
  PaymentMethodCode,
} from '../../../core/api/orders/checkout.models';

import { LocationPicker } from '../../../shared/components/location-picker/location-picker';

type StepId = 0 | 1 | 2;
type TagSeverity = 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast';

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,

    ButtonModule,
    DividerModule,
    RadioButtonModule,
    TextareaModule,
    InputNumberModule,
    TagModule,

    GoogleLoginDialogComponent,
    LocationPicker,
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  readonly cart = inject(CartStore);
  readonly auth = inject(AuthStore);
  private readonly api = inject(CheckoutApiService);
  private readonly configApi = inject(CheckoutConfigApiService);
  private readonly msg = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  @ViewChild(GoogleLoginDialogComponent) loginDialog!: GoogleLoginDialogComponent;

  readonly activeStep = signal<StepId>(0);
  readonly placing = signal(false);
  readonly order = signal<OrderDto | null>(null);

  readonly configLoading = signal(false);
  readonly checkoutConfig = signal<CheckoutConfigResponse['data'] | null>(null);
  readonly transferAccount = computed(() => this.checkoutConfig()?.transfer ?? null);

  readonly hasItems = computed(() => this.cart.items().length > 0);

  readonly showManualAddress = signal(false);

  readonly form = this.fb.group({
    delivery_type: this.fb.control<DeliveryTypeCode>('pickup', { validators: [Validators.required], nonNullable: true }),
    address: this.fb.control<string>('', { validators: [this.optionalTextRangeValidator(10, 255)] }),
    delivery_location: this.fb.control<DeliveryLocationDto | null>(null),
    payment_method: this.fb.control<PaymentMethodCode | null>(null, { validators: [Validators.required] }),
    notes: this.fb.control<string>(''),
  });

  readonly deliveryType = toSignal(this.form.controls.delivery_type.valueChanges, {
    initialValue: this.form.controls.delivery_type.value,
  });

  readonly paymentMethod = toSignal(this.form.controls.payment_method.valueChanges, {
    initialValue: this.form.controls.payment_method.value,
  });

  readonly addressText = toSignal(this.form.controls.address.valueChanges, {
    initialValue: this.form.controls.address.value,
  });

  readonly deliveryLocation = toSignal(this.form.controls.delivery_location.valueChanges, {
    initialValue: this.form.controls.delivery_location.value,
  });

  readonly isDelivery = computed(() => this.deliveryType() === 'delivery');
  readonly isTransfer = computed(() => this.paymentMethod() === 'transfer');

  readonly isOptionalAddressOk = computed(() => {
    if (!this.isDelivery()) return true;
    const raw = (this.addressText() ?? '').trim();
    if (!raw.length) return true;
    return raw.length >= 10 && raw.length <= 255;
  });

  readonly isLocationOk = computed(() => {
    if (!this.isDelivery()) return true;
    const loc = this.deliveryLocation();
    return !!loc && typeof loc.lat === 'number' && typeof loc.lng === 'number';
  });

  readonly deliveryTypeLabel = computed(() => (this.isDelivery() ? 'Delivery' : 'Retiro'));

  readonly paymentLabel = computed(() => {
    const v = this.paymentMethod();
    if (!v) return 'Selecciona';
    if (v === 'transfer') return 'Transferencia';
    if (v === 'cash') return 'Efectivo';
    return 'Tarjeta';
  });

  private readonly statusSeverityMap: Record<string, TagSeverity> = {
    pending: 'warn',
    preparing: 'info',
    ready: 'success',
    delivered: 'success',
    cancelled: 'danger',
  };

  readonly orderStatusSeverity = computed<TagSeverity>(() => {
    const status = (this.order()?.status ?? '').toString().trim().toLowerCase();
    return this.statusSeverityMap[status] ?? 'secondary';
  });

  readonly canProceed = computed(() => {
    const step = this.activeStep();

    if (step === 0) return this.isLocationOk() && this.isOptionalAddressOk();

    if (step === 1) {
      const pm = this.paymentMethod();
      return !!pm && pm !== 'card';
    }

    if (step === 2) return this.hasItems() && this.form.valid && this.auth.isAuthenticated();

    return false;
  });

  readonly stepMeta = computed(() => {
    const s = this.activeStep();
    return [
      { id: 0 as StepId, title: 'Entrega', desc: 'Define cómo recibes tu pedido', active: s === 0, done: s > 0 },
      { id: 1 as StepId, title: 'Pago', desc: 'Selecciona el método de pago', active: s === 1, done: s > 1 },
      { id: 2 as StepId, title: 'Revisión', desc: 'Confirma el resumen final', active: s === 2, done: false },
    ];
  });

  constructor() {
    this.cart.hydrate();
    this.loadCheckoutConfig();

    effect(() => {
      if (!this.isDelivery()) {
        this.form.controls.delivery_location.setValue(null, { emitEvent: false });
        this.form.controls.address.setValue('', { emitEvent: false });
        this.showManualAddress.set(false);
      }
    });
  }

  private loadCheckoutConfig(): void {
    this.configLoading.set(true);
    this.configApi
      .getConfig()
      .pipe(finalize(() => this.configLoading.set(false)))
      .subscribe({
        next: (res) => this.checkoutConfig.set(res.data),
        error: () => this.checkoutConfig.set(null),
      });
  }

  openLogin(): void {
    this.loginDialog?.open();
  }

  openWhatsApp(): void {
    const url = this.order()?.whatsapp_receipt_url;
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  goTo(step: StepId): void {
    if (step <= this.activeStep()) this.activeStep.set(step);
  }

  prev(): void {
    this.activeStep.set(Math.max(0, this.activeStep() - 1) as StepId);
  }

  next(): void {
    this.activeStep.set(Math.min(2, this.activeStep() + 1) as StepId);
  }

  toggleManualAddress(): void {
    this.showManualAddress.set(!this.showManualAddress());
    if (!this.showManualAddress()) {
      this.form.controls.address.setValue('', { emitEvent: true });
    }
  }

  /** ✅ Limpia el estado visual del checkout (sin storage) */
  private resetCheckout(): void {
    this.order.set(null);
    this.activeStep.set(0);
    this.showManualAddress.set(false);

    // resetea el form a valores por defecto
    this.form.reset({
      delivery_type: 'pickup',
      address: '',
      delivery_location: null,
      payment_method: null,
      notes: '',
    });

    // opcional: por si el usuario estaba en delivery, vuelves a modo pickup limpio
    this.form.controls.delivery_type.setValue('pickup', { emitEvent: true });
  }

  /** ✅ Para cuando el cliente quiere seguir comprando */
  continueShopping(): void {
    this.resetCheckout();
    this.router.navigate(['/']); // menú
  }

  /** ✅ Si quieres permitir hacer otro pedido SIN salir de checkout */
  newOrder(): void {
    this.resetCheckout();
    // te quedas en /checkout
  }

  confirm(): void {
    if (!this.hasItems()) {
      this.msg.add({ severity: 'warn', summary: 'Carrito vacío', detail: 'Agrega productos antes de pagar.' });
      this.activeStep.set(0);
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.msg.add({ severity: 'info', summary: 'Inicia sesión', detail: 'Necesitas iniciar sesión para confirmar el pedido.' });
      this.openLogin();
      return;
    }

    if (!this.form.valid) {
      this.msg.add({ severity: 'warn', summary: 'Datos incompletos', detail: 'Revisa los datos del checkout.' });
      return;
    }

    const v = this.form.getRawValue();

    if (!v.payment_method) {
      this.msg.add({ severity: 'warn', summary: 'Pago', detail: 'Selecciona un método de pago.' });
      this.activeStep.set(1);
      return;
    }

    if (v.delivery_type === 'delivery') {
      if (!this.isLocationOk()) {
        this.msg.add({ severity: 'warn', summary: 'Ubicación', detail: 'Selecciona tu ubicación (pin) en el mapa.' });
        this.activeStep.set(0);
        return;
      }
      if (!this.isOptionalAddressOk()) {
        this.msg.add({
          severity: 'warn',
          summary: 'Dirección manual',
          detail: 'Si vas a escribir dirección manual, debe tener mínimo 10 caracteres.',
        });
        this.activeStep.set(0);
        return;
      }
    }

    const trimmedAddress = (v.address ?? '').trim();
    const payload: CheckoutRequestDto = {
      delivery_type: v.delivery_type,
      payment_method: v.payment_method,
      notes: (v.notes ?? '').trim() ? (v.notes ?? '').trim() : null,
      delivery_location: v.delivery_type === 'delivery' ? v.delivery_location : null,
      address: v.delivery_type === 'delivery' ? (trimmedAddress ? trimmedAddress : null) : null,
    };

    this.placing.set(true);

    this.api
      .checkout(payload)
      .pipe(finalize(() => this.placing.set(false)))
      .subscribe({
        next: (res) => {
          this.order.set(res.data);
          this.msg.add({ severity: 'success', summary: 'Pedido confirmado', detail: `Orden ${res.data.order_number}` });

          // ✅ Muy importante: actualizar carrito (normalmente queda vacío o nuevo estado)
          this.cart.hydrate();
        },
        error: (err) => {
          const detail =
            err?.error?.message ??
            (err?.error?.errors ? JSON.stringify(err.error.errors) : null) ??
            'No se pudo confirmar el pedido.';
          this.msg.add({ severity: 'error', summary: `Error ${err?.status ?? ''}`, detail });
        },
      });
  }

  private optionalTextRangeValidator(min: number, max: number): ValidatorFn {
    return (control: AbstractControl<string | null>): ValidationErrors | null => {
      const v = (control.value ?? '').trim();
      if (!v.length) return null;
      if (v.length < min) return { minLengthOptional: { requiredLength: min, actualLength: v.length } };
      if (v.length > max) return { maxLengthOptional: { requiredLength: max, actualLength: v.length } };
      return null;
    };
  }
}
