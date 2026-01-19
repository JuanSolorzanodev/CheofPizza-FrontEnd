import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { StepsModule } from 'primeng/steps';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MessageService, MenuItem } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';

import { CheckoutApiService } from '../../../core/api/orders/checkout-api.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { CartStore } from '../../../core/api/cart/cart.store';
import { GoogleLoginDialogComponent } from '../../../shared/components/google-login-dialog/google-login-dialog';
import { CheckoutRequestDto, OrderDto, DeliveryTypeCode, PaymentMethodCode } from '../../../core/api/orders/checkout.models';



@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,
    ReactiveFormsModule,
    FormsModule,
    StepsModule,
    ButtonModule,
    DividerModule,
    RadioButtonModule,
    TextareaModule,
    InputNumberModule,

    GoogleLoginDialogComponent,
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage {
  readonly cart = inject(CartStore);
  readonly auth = inject(AuthStore);
  private readonly api = inject(CheckoutApiService);
  private readonly msg = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  @ViewChild(GoogleLoginDialogComponent) loginDialog!: GoogleLoginDialogComponent;

  readonly activeStep = signal(0);
  readonly placing = signal(false);
  readonly order = signal<OrderDto | null>(null);

  readonly hasItems = computed(() => this.cart.items().length > 0);

  // Wizard form
  readonly form = this.fb.group({
    delivery_type: this.fb.control<DeliveryTypeCode>('pickup', { validators: [Validators.required], nonNullable: true }),
    address: this.fb.control<string>(''),
    payment_method: this.fb.control<PaymentMethodCode>('transfer', { validators: [Validators.required], nonNullable: true }),
    notes: this.fb.control<string>(''),
  });

  readonly steps = computed<MenuItem[]>(() => [
    { label: 'Entrega' },
    { label: 'Pago' },
    { label: 'Revisión' },
    { label: 'Confirmación' },
  ]);

  constructor() {
    // ✅ Asegura carrito actualizado al entrar
    this.cart.hydrate();

    // ✅ Validación condicional: address requerido si delivery
    effect(() => {
      const type = this.form.controls.delivery_type.value;
      const address = this.form.controls.address;

      if (type === 'delivery') {
        address.setValidators([Validators.required, Validators.minLength(10), Validators.maxLength(255)]);
      } else {
        address.clearValidators();
        address.setValue('', { emitEvent: false });
      }

      address.updateValueAndValidity({ emitEvent: false });
    });
  }

  openLogin(): void {
    this.loginDialog?.open();
  }

  prev(): void {
    this.activeStep.set(Math.max(0, this.activeStep() - 1));
  }

  next(): void {
    this.activeStep.set(Math.min(3, this.activeStep() + 1));
  }

  canNext = computed(() => {
    const step = this.activeStep();
    const type = this.form.controls.delivery_type.value;

    if (step === 0) {
      if (type === 'pickup') return true;
      return this.form.controls.address.valid;
    }

    if (step === 1) {
      // card queda preparado, pero deshabilitado a nivel UI (en template)
      return this.form.controls.payment_method.valid && this.form.controls.payment_method.value !== 'card';
    }

    if (step === 2) {
      return this.hasItems() && this.form.valid && this.auth.isAuthenticated();
    }

    return false;
  });

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

    // Si el usuario eligió delivery, address llega validado; caso contrario se manda null/''.
    const payload = {
      delivery_type: v.delivery_type,
      payment_method: v.payment_method,
      address: v.delivery_type === 'delivery' ? (v.address ?? '') : null,
      notes: v.notes ?? null,
    };

    this.placing.set(true);
    this.api.checkout(payload)
      .pipe(finalize(() => this.placing.set(false)))
      .subscribe({
        next: (res) => {
          this.order.set(res.data);
          this.msg.add({ severity: 'success', summary: 'Pedido confirmado', detail: `Orden ${res.data.order_number}` });

          // refresca carrito (backend marca ordered y crea uno nuevo activo)
          this.cart.hydrate();

          // paso final
          this.activeStep.set(3);
        },
        error: () => {
          this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo confirmar el pedido.' });
        },
      });
  }
}
