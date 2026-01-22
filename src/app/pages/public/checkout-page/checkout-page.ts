import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';

import { CheckoutApiService } from '../../../core/api/orders/checkout-api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CartStore } from '../../../core/api/cart/cart.store';
import { GoogleLoginDialogComponent } from '../../../shared/components/google-login-dialog/google-login-dialog';

import { DeliveryTypeCode, OrderDto, PaymentMethodCode } from '../../../core/api/orders/checkout.models';

import {
  CheckoutConfigApiService,
  CheckoutConfigResponse,
} from '../../../core/api/orders/checkout-config-api.service';

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

  @ViewChild(GoogleLoginDialogComponent) loginDialog!: GoogleLoginDialogComponent;

  // Steps: 0 Entrega, 1 Pago, 2 Revisión (Confirmación se renderiza por order())
  readonly activeStep = signal<StepId>(0);

  readonly placing = signal(false);
  readonly order = signal<OrderDto | null>(null);

  readonly hasItems = computed(() => this.cart.items().length > 0);

  // Config transferencia
  readonly configLoading = signal(false);
  readonly checkoutConfig = signal<CheckoutConfigResponse['data'] | null>(null);
  readonly transferAccount = computed(() => this.checkoutConfig()?.transfer ?? null);

  /**
   * ✅ Form:
   * - payment_method inicia en null para NO preseleccionar transferencia.
   * - address se valida condicionalmente cuando delivery.
   */
  readonly form = this.fb.group({
    delivery_type: this.fb.control<DeliveryTypeCode>('pickup', { validators: [Validators.required], nonNullable: true }),
    address: this.fb.control<string>(''),
    payment_method: this.fb.control<PaymentMethodCode | null>(null, { validators: [Validators.required] }),
    notes: this.fb.control<string>(''),
  });

  // ✅ Reactividad estable (Angular 21): signals desde valueChanges
  readonly deliveryType = toSignal(this.form.controls.delivery_type.valueChanges, {
    initialValue: this.form.controls.delivery_type.value,
  });

  readonly paymentMethod = toSignal(this.form.controls.payment_method.valueChanges, {
    initialValue: this.form.controls.payment_method.value,
  });

  readonly isDelivery = computed(() => this.deliveryType() === 'delivery');
  readonly isTransfer = computed(() => this.paymentMethod() === 'transfer');

  /**
   * ✅ Address “business rule” para habilitar avance
   * (evita problemas por estados stale en validación)
   */
  readonly addressText = toSignal(this.form.controls.address.valueChanges, {
    initialValue: this.form.controls.address.value,
  });

  readonly isAddressOk = computed(() => {
    if (!this.isDelivery()) return true;
    const v = (this.addressText() ?? '').trim();
    return v.length >= 10 && v.length <= 255;
  });

  readonly deliveryTypeLabel = computed(() => (this.isDelivery() ? 'Delivery' : 'Retiro'));

  readonly paymentLabel = computed(() => {
    const v = this.paymentMethod();
    if (!v) return 'Selecciona';
    if (v === 'transfer') return 'Transferencia';
    if (v === 'cash') return 'Efectivo';
    return 'Tarjeta';
  });

  // ✅ UI mapping para tag (estético, viene status de API)
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

  // ✅ Control lineal de avance
  readonly canProceed = computed(() => {
    const step = this.activeStep();

    if (step === 0) {
      return this.isAddressOk();
    }

    if (step === 1) {
      // payment_method requerido y no card
      const pm = this.paymentMethod();
      return !!pm && pm !== 'card';
    }

    if (step === 2) {
      return this.hasItems() && this.form.valid && this.auth.isAuthenticated();
    }

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
    // Carrito
    this.cart.hydrate();

    // Config checkout (transferencia)
    this.loadCheckoutConfig();

    // ✅ Validación condicional address (si es delivery, requerido)
    effect(() => {
      const address = this.form.controls.address;

      if (this.isDelivery()) {
        address.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(255)]);
      } else {
        address.clearValidators();
        address.setValue('', { emitEvent: false });
      }

      // ✅ Recalcula estado real (sin emitEvent:false)
      address.updateValueAndValidity();
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
    // Lineal: solo permite ir hacia atrás o mismo
    if (step <= this.activeStep()) this.activeStep.set(step);
  }

  prev(): void {
    this.activeStep.set(Math.max(0, this.activeStep() - 1) as StepId);
  }

  next(): void {
    this.activeStep.set(Math.min(2, this.activeStep() + 1) as StepId);
  }

  confirm(): void {
    if (!this.hasItems()) {
      this.msg.add({ severity: 'warn', summary: 'Carrito vacío', detail: 'Agrega productos antes de pagar.' });
      this.activeStep.set(0);
      return;
    }

    if (!this.auth.isAuthenticated()) {
      this.msg.add({
        severity: 'info',
        summary: 'Inicia sesión',
        detail: 'Necesitas iniciar sesión para confirmar el pedido.',
      });
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

    if (v.delivery_type === 'delivery' && !this.isAddressOk()) {
      this.msg.add({ severity: 'warn', summary: 'Dirección', detail: 'Ingresa una dirección válida (mínimo 10 caracteres).' });
      this.activeStep.set(0);
      return;
    }

    const payload = {
      delivery_type: v.delivery_type,
      payment_method: v.payment_method,
      address: v.delivery_type === 'delivery' ? (v.address ?? '') : null,
      notes: v.notes ?? null,
    };

    this.placing.set(true);

    this.api
      .checkout(payload)
      .pipe(finalize(() => this.placing.set(false)))
      .subscribe({
        next: (res) => {
          this.order.set(res.data);
          this.msg.add({ severity: 'success', summary: 'Pedido confirmado', detail: `Orden ${res.data.order_number}` });
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
}
