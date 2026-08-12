import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import {
  AdminCategory,
  AdminSize,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import { AdminPromotionsApiService } from '../../../core/api/admin/promotions/admin-promotions-api.service';
import {
  AdminPromotion,
  AdminPromotionPayload,
  AdminPromotionType,
  AdminPromotionValidationErrorResponse,
} from '../../../core/api/admin/promotions/admin-promotions.models';

interface SelectOption<T> {
  label: string;
  value: T;
}

type PromotionDetailForm = FormGroup<{
  category_id: FormControl<number>;
  size_id: FormControl<number>;
  required_quantity: FormControl<number>;
}>;

type PromotionSizePriceForm = FormGroup<{
  size_id: FormControl<number>;
  price: FormControl<number>;
}>;

@Component({
  selector: 'app-admin-promotion-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
  ],
  templateUrl: './admin-promotion-form-dialog.html',
  styleUrl: './admin-promotion-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromotionFormDialogComponent {
  private readonly promotionsApi = inject(AdminPromotionsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private initializedKey: string | null = null;

  readonly visible = input(false);
  readonly promotion = input<AdminPromotion | null>(null);
  readonly categories = input<AdminCategory[]>([]);
  readonly sizes = input<AdminSize[]>([]);

  readonly visibleChange = output<boolean>();
  readonly saved = output<AdminPromotion>();
  readonly savingChange = output<boolean>();

  readonly saving = signal(false);
  readonly currentFormType = signal<AdminPromotionType>('fixed_combo');

  readonly typeOptions: SelectOption<AdminPromotionType>[] = [
    {
      label: 'Combo fijo',
      value: 'fixed_combo',
    },
    {
      label: 'Precio por tamaño',
      value: 'size_fixed_price',
    },
  ];

  readonly promotionForm = this.fb.nonNullable.group({
    name: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(150),
      ],
    ],
    slug: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(180),
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
      ],
    ],
    description: ['', [Validators.maxLength(3000)]],
    banner_image_url: [
      '',
      [
        Validators.maxLength(2048),
        Validators.pattern(/^https?:\/\/.+/i),
      ],
    ],
    type: [
      'fixed_combo' as AdminPromotionType,
      [Validators.required],
    ],
    selection_quantity: [
      2,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(10),
      ],
    ],
    price: [
      0,
      [
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999.99),
      ],
    ],
    starts_at: [new Date(), [Validators.required]],
    ends_at: [this.defaultEndDate(), [Validators.required]],
    is_active: [true],
    details: this.fb.array<PromotionDetailForm>([]),
    size_prices: this.fb.array<PromotionSizePriceForm>([]),
  });

  get details(): FormArray<PromotionDetailForm> {
    return this.promotionForm.controls.details;
  }

  get sizePrices(): FormArray<PromotionSizePriceForm> {
    return this.promotionForm.controls.size_prices;
  }

  constructor() {
    this.promotionForm.controls.type.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(type => {
        this.currentFormType.set(type);
        this.configureFormForType(type);
      });

    effect(() => {
      const visible = this.visible();
      const promotion = this.promotion();

      // Track these inputs so the form can initialize correctly when
      // catalogs arrive after the dialog has already been requested.
      this.categories();
      this.sizes();

      if (!visible) {
        this.initializedKey = null;
        return;
      }

      const key = promotion
        ? `edit:${promotion.id}`
        : 'new';

      if (this.initializedKey === key) {
        return;
      }

      this.initializedKey = key;

      if (promotion) {
        this.initializeForEdit(promotion);
      } else {
        this.initializeForCreate();
      }
    });
  }

  onVisibleChange(visible: boolean): void {
    if (visible) {
      this.visibleChange.emit(true);
      return;
    }

    this.requestClose();
  }

  requestClose(): void {
    if (this.saving()) {
      return;
    }

    this.visibleChange.emit(false);
  }

  generateSlug(): void {
    const name = this.promotionForm.controls.name.value;

    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    this.promotionForm.controls.slug.setValue(slug);
    this.promotionForm.controls.slug.markAsDirty();
  }

  addDetail(value?: {
    category_id?: number;
    size_id?: number;
    required_quantity?: number;
  }): void {
    const firstCategoryId = this.categories()[0]?.id ?? 0;
    const firstSizeId = this.sizes()[0]?.id ?? 0;

    this.details.push(
      this.fb.nonNullable.group({
        category_id: [
          value?.category_id ?? firstCategoryId,
          [Validators.required, Validators.min(1)],
        ],
        size_id: [
          value?.size_id ?? firstSizeId,
          [Validators.required, Validators.min(1)],
        ],
        required_quantity: [
          value?.required_quantity ?? 1,
          [
            Validators.required,
            Validators.min(1),
            Validators.max(10),
          ],
        ],
      }),
    );

    this.syncSelectionQuantity();
  }

  removeDetail(index: number): void {
    if (this.details.length <= 1) {
      this.messages.add({
        severity: 'warn',
        summary: 'Regla obligatoria',
        detail: 'Un combo necesita al menos una regla.',
        life: 3000,
      });
      return;
    }

    this.details.removeAt(index);
    this.syncSelectionQuantity();
  }

  addSizePrice(value?: {
    size_id?: number;
    price?: number;
  }): void {
    const usedSizeIds = this.sizePrices.controls.map(
      control => control.controls.size_id.value,
    );

    const availableSize = this.sizes().find(
      size => !usedSizeIds.includes(size.id),
    );

    this.sizePrices.push(
      this.fb.nonNullable.group({
        size_id: [
          value?.size_id ?? availableSize?.id ?? this.sizes()[0]?.id ?? 0,
          [Validators.required, Validators.min(1)],
        ],
        price: [
          value?.price ?? 0,
          [
            Validators.required,
            Validators.min(0.01),
            Validators.max(999999.99),
          ],
        ],
      }),
    );
  }

  removeSizePrice(index: number): void {
    if (this.sizePrices.length <= 1) {
      this.messages.add({
        severity: 'warn',
        summary: 'Precio obligatorio',
        detail: 'Configura al menos un precio por tamaño.',
        life: 3000,
      });
      return;
    }

    this.sizePrices.removeAt(index);
  }

  syncSelectionQuantity(): void {
    const total = this.details.controls.reduce(
      (sum, control) =>
        sum + Number(control.controls.required_quantity.value || 0),
      0,
    );

    this.promotionForm.controls.selection_quantity.setValue(
      Math.max(1, total),
      { emitEvent: false },
    );
  }

  isFieldInvalid(
    field:
      | 'name'
      | 'slug'
      | 'description'
      | 'banner_image_url'
      | 'type'
      | 'selection_quantity'
      | 'price'
      | 'starts_at'
      | 'ends_at',
  ): boolean {
    const control = this.promotionForm.controls[field];

    return control.invalid && (control.touched || control.dirty);
  }

  savePromotion(): void {
    this.syncSelectionQuantity();
    this.clearServerErrors();
    this.validateFormConfiguration();
    this.promotionForm.markAllAsTouched();

    if (this.promotionForm.invalid || this.saving()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Revisa el formulario',
        detail: 'Corrige los campos marcados antes de guardar.',
        life: 3500,
      });
      return;
    }

    const value = this.promotionForm.getRawValue();

    const payload: AdminPromotionPayload = {
      name: value.name.trim(),
      slug: value.slug.trim(),
      description: value.description.trim() || null,
      banner_image_url: value.banner_image_url.trim() || null,
      type: value.type,
      selection_quantity: Number(value.selection_quantity),
      price: value.type === 'fixed_combo' ? Number(value.price) : 0,
      starts_at: this.toApiDate(value.starts_at),
      ends_at: this.toApiDate(value.ends_at),
      is_active: Boolean(value.is_active),
      details:
        value.type === 'fixed_combo'
          ? value.details.map(detail => ({
              category_id: Number(detail.category_id),
              size_id: Number(detail.size_id),
              required_quantity: Number(detail.required_quantity),
            }))
          : [],
      size_prices:
        value.type === 'size_fixed_price'
          ? value.size_prices.map(sizePrice => ({
              size_id: Number(sizePrice.size_id),
              price: Number(sizePrice.price),
            }))
          : [],
    };

    const editing = this.promotion();
    const request = editing
      ? this.promotionsApi.updatePromotion(editing.id, payload)
      : this.promotionsApi.createPromotion(payload);

    this.setSaving(true);

    request
      .pipe(
        finalize(() => this.setSaving(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.messages.add({
            severity: 'success',
            summary: editing
              ? 'Promoción actualizada'
              : 'Promoción creada',
            detail: response.message,
            life: 3200,
          });

          this.saved.emit(response.data);
          this.visibleChange.emit(false);
        },
        error: (error: HttpErrorResponse) => {
          this.applyServerErrors(error);

          this.messages.add({
            severity: 'error',
            summary: 'No se guardó la promoción',
            detail: this.errorMessage(error),
            life: 5000,
          });
        },
      });
  }

  categoryOptions(): SelectOption<number>[] {
    return this.categories().map(category => ({
      label: category.name,
      value: category.id,
    }));
  }

  sizeOptions(): SelectOption<number>[] {
    return [...this.sizes()]
      .sort((a, b) => a.portion - b.portion)
      .map(size => ({
        label: `${size.name} · ${size.portion} porciones`,
        value: size.id,
      }));
  }

  private initializeForCreate(): void {
    this.clearFormArrays();

    this.promotionForm.reset(
      {
        name: '',
        slug: '',
        description: '',
        banner_image_url: '',
        type: 'fixed_combo',
        selection_quantity: 2,
        price: 0,
        starts_at: new Date(),
        ends_at: this.defaultEndDate(),
        is_active: true,
      },
      { emitEvent: false },
    );

    this.currentFormType.set('fixed_combo');
    this.applyTypeValidators('fixed_combo');
    this.addDetail();
    this.addDetail();
    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();
  }

  private initializeForEdit(promotion: AdminPromotion): void {
    this.clearFormArrays();

    this.promotionForm.reset(
      {
        name: promotion.name,
        slug: promotion.slug,
        description: promotion.description ?? '',
        banner_image_url: promotion.banner_image_url ?? '',
        type: promotion.type,
        selection_quantity: promotion.selection_quantity,
        price: promotion.price,
        starts_at: promotion.starts_at
          ? new Date(promotion.starts_at)
          : new Date(),
        ends_at: promotion.ends_at
          ? new Date(promotion.ends_at)
          : this.defaultEndDate(),
        is_active: promotion.is_active,
      },
      { emitEvent: false },
    );

    this.currentFormType.set(promotion.type);
    this.applyTypeValidators(promotion.type);

    if (promotion.type === 'fixed_combo') {
      for (const detail of promotion.details) {
        this.addDetail({
          category_id: detail.category_id,
          size_id: detail.size_id,
          required_quantity: detail.required_quantity,
        });
      }

      if (this.details.length === 0) {
        this.addDetail();
      }
    } else {
      for (const sizePrice of promotion.size_prices) {
        this.addSizePrice({
          size_id: sizePrice.size_id,
          price: sizePrice.price,
        });
      }

      if (this.sizePrices.length === 0) {
        this.addSizePrice();
      }
    }

    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();
  }

  private configureFormForType(type: AdminPromotionType): void {
    this.clearServerErrors();

    if (type === 'fixed_combo') {
      this.clearSizePrices();
      this.applyTypeValidators(type);

      if (this.details.length === 0) {
        this.addDetail();
        this.addDetail();
      }

      this.syncSelectionQuantity();
      return;
    }

    this.clearDetails();
    this.applyTypeValidators(type);
    this.promotionForm.controls.selection_quantity.setValue(1, {
      emitEvent: false,
    });

    if (this.sizePrices.length === 0) {
      this.addSizePrice();
    }
  }

  private applyTypeValidators(type: AdminPromotionType): void {
    const priceControl = this.promotionForm.controls.price;

    if (type === 'fixed_combo') {
      priceControl.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(999999.99),
      ]);
    } else {
      priceControl.clearValidators();
      priceControl.setValue(0, { emitEvent: false });
    }

    priceControl.updateValueAndValidity({ emitEvent: false });
  }

  private validateFormConfiguration(): void {
    const type = this.promotionForm.controls.type.value;
    const startsAt = this.promotionForm.controls.starts_at.value;
    const endsAt = this.promotionForm.controls.ends_at.value;

    if (startsAt && endsAt && endsAt <= startsAt) {
      this.promotionForm.controls.ends_at.setErrors({ afterStart: true });
    }

    if (type === 'fixed_combo') {
      if (this.details.length === 0) {
        this.promotionForm.controls.details.setErrors({ required: true });
        return;
      }

      const sizeIds = this.details.controls.map(control =>
        Number(control.controls.size_id.value),
      );

      if (new Set(sizeIds).size > 1) {
        this.promotionForm.controls.details.setErrors({ sameSize: true });
      }

      const combinations = this.details.controls.map(
        control =>
          `${control.controls.category_id.value}|${control.controls.size_id.value}`,
      );

      if (new Set(combinations).size !== combinations.length) {
        this.promotionForm.controls.details.setErrors({ duplicate: true });
      }

      return;
    }

    if (this.sizePrices.length === 0) {
      this.promotionForm.controls.size_prices.setErrors({ required: true });
      return;
    }

    const sizeIds = this.sizePrices.controls.map(control =>
      Number(control.controls.size_id.value),
    );

    if (new Set(sizeIds).size !== sizeIds.length) {
      this.promotionForm.controls.size_prices.setErrors({ duplicate: true });
    }
  }

  private clearFormArrays(): void {
    this.clearDetails();
    this.clearSizePrices();
  }

  private clearDetails(): void {
    while (this.details.length > 0) {
      this.details.removeAt(0);
    }
  }

  private clearSizePrices(): void {
    while (this.sizePrices.length > 0) {
      this.sizePrices.removeAt(0);
    }
  }

  private clearServerErrors(): void {
    this.promotionForm.controls.details.setErrors(null);
    this.promotionForm.controls.size_prices.setErrors(null);

    const endsAtControl = this.promotionForm.controls.ends_at;

    if (endsAtControl.hasError('afterStart')) {
      const errors = { ...endsAtControl.errors };
      delete errors['afterStart'];
      endsAtControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
    }
  }

  private applyServerErrors(error: HttpErrorResponse): void {
    const response = error.error as
      | AdminPromotionValidationErrorResponse
      | undefined;
    const errors = response?.errors;

    if (!errors) {
      return;
    }

    for (const key of Object.keys(errors)) {
      const rootField = key.split('.')[0];

      if (rootField in this.promotionForm.controls) {
        const control = this.promotionForm.get(rootField);
        control?.setErrors({ server: errors[key] });
        control?.markAsTouched();
      }
    }
  }

  private defaultEndDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  private toApiDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  private errorMessage(error: HttpErrorResponse): string {
    const response = error.error as
      | AdminPromotionValidationErrorResponse
      | undefined;
    const errors = response?.errors;

    if (errors) {
      const firstErrorGroup = Object.values(errors)[0];
      const firstValidationError = firstErrorGroup?.[0];

      if (typeof firstValidationError === 'string') {
        return firstValidationError;
      }
    }

    if (typeof response?.message === 'string') {
      return response.message;
    }

    return 'Ocurrió un error al comunicarse con el servidor.';
  }

  private setSaving(value: boolean): void {
    this.saving.set(value);
    this.savingChange.emit(value);
  }
}
