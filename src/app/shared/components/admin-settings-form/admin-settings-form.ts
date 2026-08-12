import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import {
  AdminBusinessSettings,
  AdminBusinessSettingsPayload,
} from '../../../core/api/admin/settings/admin-settings.models';

interface SettingsFormValue {
  business_name: string;
  business_phone: string;
  business_email: string;
  business_address: string;
  accepts_orders: boolean;
  closed_message: string;
  estimated_minutes: number;
  currency: 'USD';
  timezone: string;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee: number;
  minimum_order: number;
  paypal_enabled: boolean;
  transfer_enabled: boolean;
  cash_enabled: boolean;
  whatsapp_active: boolean;
  whatsapp_phone: string;
}

type SettingsFormGroup = FormGroup<{
  business_name: FormControl<string>;
  business_phone: FormControl<string>;
  business_email: FormControl<string>;
  business_address: FormControl<string>;
  accepts_orders: FormControl<boolean>;
  closed_message: FormControl<string>;
  estimated_minutes: FormControl<number>;
  currency: FormControl<'USD'>;
  timezone: FormControl<string>;
  pickup_enabled: FormControl<boolean>;
  delivery_enabled: FormControl<boolean>;
  delivery_fee: FormControl<number>;
  minimum_order: FormControl<number>;
  paypal_enabled: FormControl<boolean>;
  transfer_enabled: FormControl<boolean>;
  cash_enabled: FormControl<boolean>;
  whatsapp_active: FormControl<boolean>;
  whatsapp_phone: FormControl<string>;
}>;

@Component({
  selector: 'app-admin-settings-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './admin-settings-form.html',
  styleUrl: './admin-settings-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly settings = input.required<AdminBusinessSettings>();
  readonly saving = input(false);
  readonly serverErrors = input<Record<string, string[]>>({});

  readonly submitSettings = output<AdminBusinessSettingsPayload>();
  readonly dirtyChange = output<boolean>();

  readonly submitted = signal(false);
  readonly dirty = signal(false);
  readonly localSectionErrors = signal<Record<string, string[]>>({});

  readonly form: SettingsFormGroup = this.formBuilder.nonNullable.group({
    business_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    business_phone: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9+()\-\s]*$/)]],
    business_email: ['', [Validators.email, Validators.maxLength(255)]],
    business_address: ['', [Validators.maxLength(500)]],
    accepts_orders: [true],
    closed_message: ['', [Validators.maxLength(500)]],
    estimated_minutes: [35, [Validators.required, Validators.min(5), Validators.max(240)]],
    currency: ['USD' as const],
    timezone: ['America/Guayaquil', [Validators.required, Validators.maxLength(80)]],
    pickup_enabled: [true],
    delivery_enabled: [true],
    delivery_fee: [0, [Validators.required, Validators.min(0), Validators.max(999999.99)]],
    minimum_order: [0, [Validators.required, Validators.min(0), Validators.max(999999.99)]],
    paypal_enabled: [true],
    transfer_enabled: [true],
    cash_enabled: [true],
    whatsapp_active: [false],
    whatsapp_phone: ['', [Validators.maxLength(30), Validators.pattern(/^[0-9+()\-\s]*$/)]],
  });

  private initialSnapshot = JSON.stringify(this.form.getRawValue());

  readonly paypalConfigured = computed(() => this.settings().payments.paypal_configured);

  constructor() {
    effect(() => {
      const currentSettings = this.settings();

      untracked(() => {
        this.patchForm(currentSettings);
      });
    });

    this.listenFormChanges();
  }

  storeStatusLabel(): string {
    return this.form.controls.accepts_orders.value ? 'Recibiendo pedidos' : 'Tienda cerrada';
  }

  deliveryMethodsCount(): number {
    return (
      Number(this.form.controls.pickup_enabled.value) +
      Number(this.form.controls.delivery_enabled.value)
    );
  }

  paymentMethodsCount(): number {
    return (
      Number(this.form.controls.paypal_enabled.value) +
      Number(this.form.controls.transfer_enabled.value) +
      Number(this.form.controls.cash_enabled.value)
    );
  }

  whatsappStatusLabel(): string {
    return this.form.controls.whatsapp_active.value ? 'Activo' : 'Inactivo';
  }

  submit(): void {
    if (this.saving()) {
      return;
    }

    this.submitted.set(true);
    this.localSectionErrors.set({});
    this.applyConditionalValidators();
    this.form.markAllAsTouched();

    if (!this.hasDeliveryMethod()) {
      this.localSectionErrors.update((errors) => ({
        ...errors,
        delivery: ['Debes habilitar retiro o entrega a domicilio.'],
      }));
    }

    if (!this.hasPaymentMethod()) {
      this.localSectionErrors.update((errors) => ({
        ...errors,
        payments: ['Debes habilitar al menos un método de pago.'],
      }));
    }

    if (this.form.invalid || !this.hasDeliveryMethod() || !this.hasPaymentMethod()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Revisa el formulario',
        detail: 'Hay campos pendientes o configuraciones incompatibles.',
      });
      this.scrollToFirstError();
      return;
    }

    this.submitSettings.emit(this.buildPayload());
  }

  discardChanges(): void {
    this.patchForm(this.settings());
    this.localSectionErrors.set({});
    this.submitted.set(false);
  }

  fieldError(controlName: keyof SettingsFormValue): string | null {
    const apiKey = this.apiFieldName(controlName);
    const serverError = this.serverErrors()[apiKey]?.[0];

    if (serverError) {
      return serverError;
    }

    const control = this.form.controls[controlName];
    if (!control.invalid || (!control.touched && !this.submitted())) {
      return null;
    }

    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('email')) return 'Ingresa un correo electrónico válido.';
    if (control.hasError('minlength')) return 'El valor ingresado es demasiado corto.';
    if (control.hasError('maxlength')) return 'El valor supera la longitud permitida.';
    if (control.hasError('min')) {
      return `El valor mínimo permitido es ${control.getError('min').min}.`;
    }
    if (control.hasError('max')) {
      return `El valor máximo permitido es ${control.getError('max').max}.`;
    }
    if (control.hasError('pattern')) return 'El formato ingresado no es válido.';

    return 'Revisa este campo.';
  }

  sectionError(section: 'delivery' | 'payments'): string | null {
    return this.localSectionErrors()[section]?.[0] ?? this.serverErrors()[section]?.[0] ?? null;
  }

  private patchForm(settings: AdminBusinessSettings): void {
    this.form.reset(
      {
        business_name: settings.business.name,
        business_phone: settings.business.phone ?? '',
        business_email: settings.business.email ?? '',
        business_address: settings.business.address ?? '',
        accepts_orders: settings.store.accepts_orders,
        closed_message: settings.store.closed_message ?? '',
        estimated_minutes: settings.store.estimated_minutes,
        currency: settings.store.currency,
        timezone: settings.store.timezone,
        pickup_enabled: settings.delivery.pickup_enabled,
        delivery_enabled: settings.delivery.delivery_enabled,
        delivery_fee: settings.delivery.delivery_fee,
        minimum_order: settings.delivery.minimum_order,
        paypal_enabled: settings.payments.paypal_enabled,
        transfer_enabled: settings.payments.transfer_enabled,
        cash_enabled: settings.payments.cash_enabled,
        whatsapp_active: settings.whatsapp.active,
        whatsapp_phone: settings.whatsapp.phone ?? '',
      },
      { emitEvent: false },
    );

    this.applyConditionalValidators();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.initialSnapshot = JSON.stringify(this.form.getRawValue());
    this.setDirty(false);
  }

  private buildPayload(): AdminBusinessSettingsPayload {
    const value = this.form.getRawValue();

    return {
      business: {
        name: value.business_name.trim(),
        phone: this.nullable(value.business_phone),
        email: this.nullable(value.business_email)?.toLowerCase() ?? null,
        address: this.nullable(value.business_address),
      },
      store: {
        accepts_orders: value.accepts_orders,
        closed_message: this.nullable(value.closed_message),
        estimated_minutes: value.estimated_minutes,
        currency: value.currency,
        timezone: value.timezone.trim(),
      },
      delivery: {
        pickup_enabled: value.pickup_enabled,
        delivery_enabled: value.delivery_enabled,
        delivery_fee: value.delivery_fee,
        minimum_order: value.minimum_order,
      },
      payments: {
        paypal_enabled: value.paypal_enabled,
        transfer_enabled: value.transfer_enabled,
        cash_enabled: value.cash_enabled,
      },
      whatsapp: {
        active: value.whatsapp_active,
        phone: this.nullable(value.whatsapp_phone),
      },
    };
  }

  private listenFormChanges(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyConditionalValidators();
      this.clearResolvedSectionErrors();
      this.setDirty(JSON.stringify(this.form.getRawValue()) !== this.initialSnapshot);
    });
  }

  private clearResolvedSectionErrors(): void {
    this.localSectionErrors.update((errors) => {
      const next = { ...errors };

      if (this.hasDeliveryMethod()) delete next['delivery'];
      if (this.hasPaymentMethod()) delete next['payments'];

      return next;
    });
  }

  private setDirty(value: boolean): void {
    if (this.dirty() === value) {
      return;
    }

    this.dirty.set(value);
    this.dirtyChange.emit(value);
  }

  private applyConditionalValidators(): void {
    this.updateRequiredValidator(
      this.form.controls.closed_message,
      !this.form.controls.accepts_orders.value,
    );

    this.updateRequiredValidator(
      this.form.controls.whatsapp_phone,
      this.form.controls.whatsapp_active.value,
    );
  }

  private updateRequiredValidator(control: AbstractControl, required: boolean): void {
    if (required) {
      control.addValidators(Validators.required);
    } else {
      control.removeValidators(Validators.required);
    }

    control.updateValueAndValidity({ emitEvent: false });
  }

  private hasDeliveryMethod(): boolean {
    return this.form.controls.pickup_enabled.value || this.form.controls.delivery_enabled.value;
  }

  private hasPaymentMethod(): boolean {
    return (
      this.form.controls.paypal_enabled.value ||
      this.form.controls.transfer_enabled.value ||
      this.form.controls.cash_enabled.value
    );
  }

  private apiFieldName(controlName: keyof SettingsFormValue): string {
    const fields: Record<keyof SettingsFormValue, string> = {
      business_name: 'business.name',
      business_phone: 'business.phone',
      business_email: 'business.email',
      business_address: 'business.address',
      accepts_orders: 'store.accepts_orders',
      closed_message: 'store.closed_message',
      estimated_minutes: 'store.estimated_minutes',
      currency: 'store.currency',
      timezone: 'store.timezone',
      pickup_enabled: 'delivery.pickup_enabled',
      delivery_enabled: 'delivery.delivery_enabled',
      delivery_fee: 'delivery.delivery_fee',
      minimum_order: 'delivery.minimum_order',
      paypal_enabled: 'payments.paypal_enabled',
      transfer_enabled: 'payments.transfer_enabled',
      cash_enabled: 'payments.cash_enabled',
      whatsapp_active: 'whatsapp.active',
      whatsapp_phone: 'whatsapp.phone',
    };

    return fields[controlName];
  }

  private nullable(value: string): string | null {
    const normalized = value.trim();
    return normalized === '' ? null : normalized;
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      this.document
        .querySelector<HTMLElement>(
          '.admin-settings-form .ng-invalid, .admin-settings-form .section-error',
        )
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
