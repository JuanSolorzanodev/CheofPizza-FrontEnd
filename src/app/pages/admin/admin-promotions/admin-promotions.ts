import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  ConfirmationService,
  MessageService,
} from 'primeng/api';
import {
  ButtonModule,
} from 'primeng/button';
import {
  ConfirmDialogModule,
} from 'primeng/confirmdialog';
import {
  DatePickerModule,
} from 'primeng/datepicker';
import {
  DialogModule,
} from 'primeng/dialog';
import {
  InputNumberModule,
} from 'primeng/inputnumber';
import {
  InputTextModule,
} from 'primeng/inputtext';
import {
  SelectModule,
} from 'primeng/select';
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
  ToggleSwitchModule,
} from 'primeng/toggleswitch';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  AdminCatalogApiService,
} from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminCategory,
  AdminSize,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import {
  AdminPromotionsApiService,
} from '../../../core/api/admin/promotions/admin-promotions-api.service';
import {
  AdminPromotion,
  AdminPromotionPayload,
  AdminPromotionStatus,
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
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    ToggleSwitchModule,
    TooltipModule,
  ],
  providers: [
    ConfirmationService,
  ],
  templateUrl:
    './admin-promotions.html',
  styleUrl:
    './admin-promotions.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminPromotions {
  private readonly promotionsApi =
    inject(
      AdminPromotionsApiService,
    );

  private readonly catalogApi =
    inject(
      AdminCatalogApiService,
    );

  private readonly fb =
    inject(FormBuilder);

  private readonly messages =
    inject(MessageService);

  private readonly confirmation =
    inject(ConfirmationService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly saving =
    signal(false);

  readonly deletingId =
    signal<number | null>(null);

  readonly changingVisibilityId =
    signal<number | null>(null);

  readonly dialogVisible =
    signal(false);

  readonly promotions =
    signal<AdminPromotion[]>([]);

  readonly categories =
    signal<AdminCategory[]>([]);

  readonly sizes =
    signal<AdminSize[]>([]);

  readonly editingPromotion =
    signal<AdminPromotion | null>(null);

  readonly search =
    signal('');

  readonly selectedStatus =
    signal<
      AdminPromotionStatus | 'all'
    >('all');

  readonly selectedType =
    signal<
      AdminPromotionType | 'all'
    >('all');

  readonly currentFormType =
    signal<AdminPromotionType>(
      'fixed_combo',
    );

  readonly typeOptions =
    signal<
      SelectOption<AdminPromotionType>[]
    >([
      {
        label: 'Combo fijo',
        value: 'fixed_combo',
      },
      {
        label: 'Precio por tamaño',
        value: 'size_fixed_price',
      },
    ]);

  readonly statusFilterOptions =
    signal<
      SelectOption<
        AdminPromotionStatus | 'all'
      >[]
    >([
      {
        label: 'Todos los estados',
        value: 'all',
      },
      {
        label: 'Activas',
        value: 'active',
      },
      {
        label: 'Programadas',
        value: 'scheduled',
      },
      {
        label: 'Finalizadas',
        value: 'finished',
      },
      {
        label: 'Inactivas',
        value: 'inactive',
      },
    ]);

  readonly typeFilterOptions =
    signal<
      SelectOption<
        AdminPromotionType | 'all'
      >[]
    >([
      {
        label: 'Todos los tipos',
        value: 'all',
      },
      {
        label: 'Combos fijos',
        value: 'fixed_combo',
      },
      {
        label: 'Precio por tamaño',
        value: 'size_fixed_price',
      },
    ]);

  readonly categoryOptions =
    computed<
      SelectOption<number>[]
    >(() =>
      this.categories().map(
        category => ({
          label: category.name,
          value: category.id,
        }),
      ),
    );

  readonly sizeOptions =
    computed<
      SelectOption<number>[]
    >(() =>
      [...this.sizes()]
        .sort(
          (a, b) =>
            a.portion -
            b.portion,
        )
        .map(size => ({
          label:
            `${size.name} · ${size.portion} porciones`,
          value: size.id,
        })),
    );

  readonly totalPromotions =
    computed(
      () =>
        this.promotions().length,
    );

  readonly activePromotions =
    computed(
      () =>
        this.promotions().filter(
          promotion =>
            promotion.status ===
            'active',
        ).length,
    );

  readonly scheduledPromotions =
    computed(
      () =>
        this.promotions().filter(
          promotion =>
            promotion.status ===
            'scheduled',
        ).length,
    );

  readonly protectedPromotions =
    computed(
      () =>
        this.promotions().filter(
          promotion =>
            !promotion.can_delete,
        ).length,
    );

  readonly filteredPromotions =
    computed(() => {
      const query =
        this.search()
          .trim()
          .toLocaleLowerCase('es');

      const status =
        this.selectedStatus();

      const type =
        this.selectedType();

      return this.promotions().filter(
        promotion => {
          const searchableText = [
            promotion.name,
            promotion.slug,
            promotion.description ?? '',
            this.typeLabel(promotion),

            ...promotion.details.map(
              detail =>
                [
                  detail.category?.name ?? '',
                  detail.size?.name ?? '',
                ].join(' '),
            ),

            ...promotion.size_prices.map(
              price =>
                price.size?.name ?? '',
            ),
          ]
            .join(' ')
            .toLocaleLowerCase('es');

          const matchesSearch =
            query === '' ||
            searchableText.includes(
              query,
            );

          const matchesStatus =
            status === 'all' ||
            promotion.status ===
              status;

          const matchesType =
            type === 'all' ||
            promotion.type === type;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        },
      );
    });

  readonly promotionForm =
    this.fb.nonNullable.group({
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
          Validators.pattern(
            /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
          ),
        ],
      ],

      description: [
        '',
        [
          Validators.maxLength(3000),
        ],
      ],

      banner_image_url: [
        '',
        [
          Validators.maxLength(2048),
          Validators.pattern(
            /^https?:\/\/.+/i,
          ),
        ],
      ],

      type: [
        'fixed_combo' as AdminPromotionType,
        [
          Validators.required,
        ],
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

      starts_at: [
        new Date(),
        [
          Validators.required,
        ],
      ],

      ends_at: [
        this.defaultEndDate(),
        [
          Validators.required,
        ],
      ],

      is_active: [
        true,
      ],

      details:
        this.fb.array<
          PromotionDetailForm
        >([]),

      size_prices:
        this.fb.array<
          PromotionSizePriceForm
        >([]),
    });

  get details(): FormArray<
    PromotionDetailForm
  > {
    return this.promotionForm.controls
      .details;
  }

  get sizePrices(): FormArray<
    PromotionSizePriceForm
  > {
    return this.promotionForm.controls
      .size_prices;
  }

  constructor() {
    this.loadData();

    this.promotionForm.controls.type
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(type => {
        this.currentFormType.set(
          type,
        );

        this.configureFormForType(
          type,
        );
      });
  }

  loadData(
    showMainLoading = true,
  ): void {
    if (showMainLoading) {
      this.loading.set(true);
    }

    forkJoin({
      promotions:
        this.promotionsApi.promotions(),

      categories:
        this.catalogApi.categories(),

      sizes:
        this.catalogApi.sizes(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.promotions.set(
            response.promotions.data ??
              [],
          );

          this.categories.set(
            response.categories.data ??
              [],
          );

          this.sizes.set(
            response.sizes.data ??
              [],
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se cargaron las promociones',
            detail:
              this.errorMessage(
                error,
              ),
            life: 4500,
          });
        },
      });
  }

  refresh(): void {
    if (
      this.refreshing() ||
      this.saving()
    ) {
      return;
    }

    this.refreshing.set(true);
    this.loadData(false);
  }

  onSearch(
    value: string,
  ): void {
    this.search.set(
      value ?? '',
    );
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedStatus.set('all');
    this.selectedType.set('all');
  }

  openNewPromotion(): void {
    this.editingPromotion.set(null);
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
        ends_at:
          this.defaultEndDate(),
        is_active: true,
      },
      {
        emitEvent: false,
      },
    );

    this.currentFormType.set(
      'fixed_combo',
    );

    this.applyTypeValidators(
      'fixed_combo',
    );

    this.addDetail();
    this.addDetail();

    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();

    this.dialogVisible.set(true);
  }

  openEditPromotion(
    promotion: AdminPromotion,
  ): void {
    this.editingPromotion.set(
      promotion,
    );

    this.clearFormArrays();

    this.promotionForm.reset(
      {
        name:
          promotion.name,

        slug:
          promotion.slug,

        description:
          promotion.description ??
          '',

        banner_image_url:
          promotion.banner_image_url ??
          '',

        type:
          promotion.type,

        selection_quantity:
          promotion.selection_quantity,

        price:
          promotion.price,

        starts_at:
          promotion.starts_at
            ? new Date(
                promotion.starts_at,
              )
            : new Date(),

        ends_at:
          promotion.ends_at
            ? new Date(
                promotion.ends_at,
              )
            : this.defaultEndDate(),

        is_active:
          promotion.is_active,
      },
      {
        emitEvent: false,
      },
    );

    this.currentFormType.set(
      promotion.type,
    );

    this.applyTypeValidators(
      promotion.type,
    );

    if (
      promotion.type ===
      'fixed_combo'
    ) {
      for (
        const detail
        of promotion.details
      ) {
        this.addDetail({
          category_id:
            detail.category_id,

          size_id:
            detail.size_id,

          required_quantity:
            detail.required_quantity,
        });
      }

      if (
        this.details.length === 0
      ) {
        this.addDetail();
      }
    } else {
      for (
        const sizePrice
        of promotion.size_prices
      ) {
        this.addSizePrice({
          size_id:
            sizePrice.size_id,

          price:
            sizePrice.price,
        });
      }

      if (
        this.sizePrices.length === 0
      ) {
        this.addSizePrice();
      }
    }

    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();

    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.dialogVisible.set(false);
    this.editingPromotion.set(null);

    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();
  }

  onDialogVisibleChange(
    visible: boolean,
  ): void {
    if (visible) {
      this.dialogVisible.set(true);
      return;
    }

    this.closeDialog();
  }

  generateSlug(): void {
    const name =
      this.promotionForm.controls
        .name.value;

    const slug =
      name
        .normalize('NFD')
        .replace(
          /[\u0300-\u036f]/g,
          '',
        )
        .toLocaleLowerCase('es')
        .replace(
          /[^a-z0-9]+/g,
          '-',
        )
        .replace(
          /^-+|-+$/g,
          '',
        );

    this.promotionForm.controls
      .slug
      .setValue(slug);

    this.promotionForm.controls
      .slug
      .markAsDirty();
  }

  addDetail(
    value?: {
      category_id?: number;
      size_id?: number;
      required_quantity?: number;
    },
  ): void {
    const firstCategoryId =
      this.categories()[0]?.id ??
      0;

    const firstSizeId =
      this.sizes()[0]?.id ??
      0;

    this.details.push(
      this.fb.nonNullable.group({
        category_id: [
          value?.category_id ??
            firstCategoryId,
          [
            Validators.required,
            Validators.min(1),
          ],
        ],

        size_id: [
          value?.size_id ??
            firstSizeId,
          [
            Validators.required,
            Validators.min(1),
          ],
        ],

        required_quantity: [
          value?.required_quantity ??
            1,
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

  removeDetail(
    index: number,
  ): void {
    if (
      this.details.length <= 1
    ) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Regla obligatoria',
        detail:
          'Un combo necesita al menos una regla.',
        life: 3000,
      });

      return;
    }

    this.details.removeAt(index);
    this.syncSelectionQuantity();
  }

  addSizePrice(
    value?: {
      size_id?: number;
      price?: number;
    },
  ): void {
    const usedSizeIds =
      this.sizePrices.controls.map(
        control =>
          control.controls.size_id
            .value,
      );

    const availableSize =
      this.sizes().find(
        size =>
          !usedSizeIds.includes(
            size.id,
          ),
      );

    this.sizePrices.push(
      this.fb.nonNullable.group({
        size_id: [
          value?.size_id ??
            availableSize?.id ??
            this.sizes()[0]?.id ??
            0,
          [
            Validators.required,
            Validators.min(1),
          ],
        ],

        price: [
          value?.price ?? 0,
          [
            Validators.required,
            Validators.min(0.01),
            Validators.max(
              999999.99,
            ),
          ],
        ],
      }),
    );
  }

  removeSizePrice(
    index: number,
  ): void {
    if (
      this.sizePrices.length <= 1
    ) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Precio obligatorio',
        detail:
          'Configura al menos un precio por tamaño.',
        life: 3000,
      });

      return;
    }

    this.sizePrices.removeAt(index);
  }

  syncSelectionQuantity(): void {
    const total =
      this.details.controls.reduce(
        (
          sum,
          control,
        ) =>
          sum +
          Number(
            control.controls
              .required_quantity
              .value || 0,
          ),
        0,
      );

    this.promotionForm.controls
      .selection_quantity
      .setValue(
        Math.max(1, total),
        {
          emitEvent: false,
        },
      );
  }

  savePromotion(): void {
    this.syncSelectionQuantity();
    this.clearServerErrors();
    this.validateFormConfiguration();

    this.promotionForm.markAllAsTouched();

    if (
      this.promotionForm.invalid ||
      this.saving()
    ) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Revisa el formulario',
        detail:
          'Corrige los campos marcados antes de guardar.',
        life: 3500,
      });

      return;
    }

    const value =
      this.promotionForm.getRawValue();

    const payload:
      AdminPromotionPayload = {
        name:
          value.name.trim(),

        slug:
          value.slug.trim(),

        description:
          value.description.trim() ||
          null,

        banner_image_url:
          value.banner_image_url
            .trim() ||
          null,

        type:
          value.type,

        selection_quantity:
          Number(
            value.selection_quantity,
          ),

        price:
          value.type ===
          'fixed_combo'
            ? Number(value.price)
            : 0,

        starts_at:
          this.toApiDate(
            value.starts_at,
          ),

        ends_at:
          this.toApiDate(
            value.ends_at,
          ),

        is_active:
          Boolean(value.is_active),

        details:
          value.type ===
          'fixed_combo'
            ? value.details.map(
                detail => ({
                  category_id:
                    Number(
                      detail.category_id,
                    ),

                  size_id:
                    Number(
                      detail.size_id,
                    ),

                  required_quantity:
                    Number(
                      detail.required_quantity,
                    ),
                }),
              )
            : [],

        size_prices:
          value.type ===
          'size_fixed_price'
            ? value.size_prices.map(
                sizePrice => ({
                  size_id:
                    Number(
                      sizePrice.size_id,
                    ),

                  price:
                    Number(
                      sizePrice.price,
                    ),
                }),
              )
            : [],
      };

    const editing =
      this.editingPromotion();

    const request =
      editing
        ? this.promotionsApi
            .updatePromotion(
              editing.id,
              payload,
            )
        : this.promotionsApi
            .createPromotion(
              payload,
            );

    this.saving.set(true);

    request
      .pipe(
        finalize(() =>
          this.saving.set(false),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          const saved =
            response.data;

          this.promotions.update(
            current => {
              const updated =
                editing
                  ? current.map(
                      promotion =>
                        promotion.id ===
                        saved.id
                          ? saved
                          : promotion,
                    )
                  : [
                      ...current,
                      saved,
                    ];

              return this.sortPromotions(
                updated,
              );
            },
          );

          this.messages.add({
            severity: 'success',
            summary: editing
              ? 'Promoción actualizada'
              : 'Promoción creada',
            detail:
              response.message,
            life: 3200,
          });

          this.dialogVisible.set(
            false,
          );

          this.editingPromotion.set(
            null,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.applyServerErrors(
            error,
          );

          this.messages.add({
            severity: 'error',
            summary:
              'No se guardó la promoción',
            detail:
              this.errorMessage(
                error,
              ),
            life: 5000,
          });
        },
      });
  }

  confirmVisibility(
    promotion: AdminPromotion,
  ): void {
    const willActivate =
      !promotion.is_active;

    if (
      willActivate &&
      !promotion.can_activate
    ) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Promoción incompleta',
        detail:
          'Completa la configuración y los precios antes de activarla.',
        life: 4200,
      });

      return;
    }

    this.confirmation.confirm({
      header: willActivate
        ? 'Activar promoción'
        : 'Desactivar promoción',

      message: willActivate
        ? `¿Activar “${promotion.name}”? Estará disponible durante su vigencia.`
        : `¿Desactivar “${promotion.name}”? Dejará de mostrarse al cliente.`,

      icon: willActivate
        ? 'pi pi-check-circle'
        : 'pi pi-pause-circle',

      acceptLabel: willActivate
        ? 'Activar'
        : 'Desactivar',

      rejectLabel:
        'Cancelar',

      acceptButtonProps: {
        severity: willActivate
          ? 'success'
          : 'warn',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () =>
        this.updateVisibility(
          promotion,
          willActivate,
        ),
    });
  }

  confirmDelete(
    promotion: AdminPromotion,
  ): void {
    if (!promotion.can_delete) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Promoción protegida',
        detail:
          'Esta promoción tiene carritos o pedidos asociados. Debes desactivarla en lugar de eliminarla.',
        life: 4500,
      });

      return;
    }

    this.confirmation.confirm({
      header:
        'Eliminar promoción',

      message:
        `¿Eliminar definitivamente “${promotion.name}”? Esta acción no se puede deshacer.`,

      icon:
        'pi pi-exclamation-triangle',

      acceptLabel:
        'Eliminar',

      rejectLabel:
        'Cancelar',

      acceptButtonProps: {
        severity: 'danger',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () =>
        this.deletePromotion(
          promotion,
        ),
    });
  }

  statusLabel(
    status: AdminPromotionStatus,
  ): string {
    const labels: Record<
      AdminPromotionStatus,
      string
    > = {
      active: 'Activa',
      scheduled: 'Programada',
      finished: 'Finalizada',
      inactive: 'Inactiva',
    };

    return labels[status];
  }

  statusSeverity(
    status: AdminPromotionStatus,
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'secondary' {
    const severities: Record<
      AdminPromotionStatus,
      | 'success'
      | 'info'
      | 'warn'
      | 'secondary'
    > = {
      active: 'success',
      scheduled: 'info',
      finished: 'warn',
      inactive: 'secondary',
    };

    return severities[status];
  }

  typeLabel(
    promotion: AdminPromotion,
  ): string {
    return promotion.type ===
      'fixed_combo'
      ? 'Combo fijo'
      : 'Precio por tamaño';
  }

  promotionPrice(
    promotion: AdminPromotion,
  ): string {
    if (
      promotion.type ===
      'fixed_combo'
    ) {
      return this.formatMoney(
        promotion.price,
      );
    }

    if (
      promotion.size_prices.length ===
      0
    ) {
      return 'Sin precios';
    }

    return promotion.size_prices
      .map(
        sizePrice =>
          `${sizePrice.size?.name ?? 'Tamaño'} ${this.formatMoney(sizePrice.price)}`,
      )
      .join(' · ');
  }

  promotionRules(
    promotion: AdminPromotion,
  ): string {
    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      return promotion.size_prices
        .map(
          item =>
            `${item.size?.name ?? 'Tamaño'}: ${this.formatMoney(item.price)}`,
        )
        .join(' · ');
    }

    if (
      promotion.details.length ===
      0
    ) {
      return 'Sin reglas configuradas';
    }

    return promotion.details
      .map(detail => {
        const quantity =
          detail.required_quantity;

        const category =
          detail.category?.name ??
          'Categoría';

        const size =
          detail.size?.name ??
          'Tamaño';

        return `${quantity} ${category} · ${size}`;
      })
      .join(' + ');
  }

  validityText(
    promotion: AdminPromotion,
  ): string {
    if (
      !promotion.starts_at ||
      !promotion.ends_at
    ) {
      return 'Vigencia no configurada';
    }

    return `${this.formatDateTime(promotion.starts_at)} — ${this.formatDateTime(promotion.ends_at)}`;
  }

  usageLabel(
    promotion: AdminPromotion,
  ): string {
    const total =
      promotion.usage.total;

    if (total === 0) {
      return 'Sin uso registrado';
    }

    return total === 1
      ? '1 asociación'
      : `${total} asociaciones`;
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
    const control =
      this.promotionForm.controls[
        field
      ];

    return (
      control.invalid &&
      (
        control.touched ||
        control.dirty
      )
    );
  }

  private configureFormForType(
    type: AdminPromotionType,
  ): void {
    this.clearServerErrors();

    if (
      type === 'fixed_combo'
    ) {
      this.clearSizePrices();

      this.applyTypeValidators(
        type,
      );

      if (
        this.details.length === 0
      ) {
        this.addDetail();
        this.addDetail();
      }

      this.syncSelectionQuantity();

      return;
    }

    this.clearDetails();

    this.applyTypeValidators(
      type,
    );

    this.promotionForm.controls
      .selection_quantity
      .setValue(
        1,
        {
          emitEvent: false,
        },
      );

    if (
      this.sizePrices.length === 0
    ) {
      this.addSizePrice();
    }
  }

  private applyTypeValidators(
    type: AdminPromotionType,
  ): void {
    const priceControl =
      this.promotionForm.controls
        .price;

    if (
      type === 'fixed_combo'
    ) {
      priceControl.setValidators([
        Validators.required,
        Validators.min(0.01),
        Validators.max(
          999999.99,
        ),
      ]);
    } else {
      priceControl.clearValidators();

      priceControl.setValue(
        0,
        {
          emitEvent: false,
        },
      );
    }

    priceControl
      .updateValueAndValidity({
        emitEvent: false,
      });
  }

  private validateFormConfiguration(): void {
    const type =
      this.promotionForm.controls
        .type.value;

    const startsAt =
      this.promotionForm.controls
        .starts_at.value;

    const endsAt =
      this.promotionForm.controls
        .ends_at.value;

    if (
      startsAt &&
      endsAt &&
      endsAt <= startsAt
    ) {
      this.promotionForm.controls
        .ends_at
        .setErrors({
          afterStart: true,
        });
    }

    if (
      type === 'fixed_combo'
    ) {
      if (
        this.details.length === 0
      ) {
        this.promotionForm.controls
          .details
          .setErrors({
            required: true,
          });

        return;
      }

      const sizeIds =
        this.details.controls.map(
          control =>
            Number(
              control.controls
                .size_id.value,
            ),
        );

      if (
        new Set(sizeIds).size > 1
      ) {
        this.promotionForm.controls
          .details
          .setErrors({
            sameSize: true,
          });
      }

      const combinations =
        this.details.controls.map(
          control =>
            `${control.controls.category_id.value}|${control.controls.size_id.value}`,
        );

      if (
        new Set(combinations).size !==
        combinations.length
      ) {
        this.promotionForm.controls
          .details
          .setErrors({
            duplicate: true,
          });
      }

      return;
    }

    if (
      this.sizePrices.length === 0
    ) {
      this.promotionForm.controls
        .size_prices
        .setErrors({
          required: true,
        });

      return;
    }

    const sizeIds =
      this.sizePrices.controls.map(
        control =>
          Number(
            control.controls
              .size_id.value,
          ),
      );

    if (
      new Set(sizeIds).size !==
      sizeIds.length
    ) {
      this.promotionForm.controls
        .size_prices
        .setErrors({
          duplicate: true,
        });
    }
  }

  private updateVisibility(
    promotion: AdminPromotion,
    isActive: boolean,
  ): void {
    if (
      this.changingVisibilityId() !==
      null
    ) {
      return;
    }

    this.changingVisibilityId.set(
      promotion.id,
    );

    this.promotionsApi
      .updateVisibility(
        promotion.id,
        {
          is_active: isActive,
        },
      )
      .pipe(
        finalize(() =>
          this.changingVisibilityId.set(
            null,
          ),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.promotions.update(
            current =>
              this.sortPromotions(
                current.map(item =>
                  item.id ===
                  response.data.id
                    ? response.data
                    : item,
                ),
              ),
          );

          this.messages.add({
            severity: 'success',
            summary: isActive
              ? 'Promoción activada'
              : 'Promoción desactivada',
            detail:
              response.message,
            life: 3000,
          });
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se cambió el estado',
            detail:
              this.errorMessage(
                error,
              ),
            life: 4500,
          });
        },
      });
  }

  private deletePromotion(
    promotion: AdminPromotion,
  ): void {
    if (
      this.deletingId() !== null
    ) {
      return;
    }

    this.deletingId.set(
      promotion.id,
    );

    this.promotionsApi
      .deletePromotion(
        promotion.id,
      )
      .pipe(
        finalize(() =>
          this.deletingId.set(
            null,
          ),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.promotions.update(
            current =>
              current.filter(
                item =>
                  item.id !==
                  promotion.id,
              ),
          );

          this.messages.add({
            severity: 'success',
            summary:
              'Promoción eliminada',
            detail:
              response.message,
            life: 3000,
          });
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se eliminó la promoción',
            detail:
              this.errorMessage(
                error,
              ),
            life: 4500,
          });
        },
      });
  }

  private clearFormArrays(): void {
    this.clearDetails();
    this.clearSizePrices();
  }

  private clearDetails(): void {
    while (
      this.details.length > 0
    ) {
      this.details.removeAt(0);
    }
  }

  private clearSizePrices(): void {
    while (
      this.sizePrices.length > 0
    ) {
      this.sizePrices.removeAt(0);
    }
  }

  private clearServerErrors(): void {
    this.promotionForm.controls
      .details
      .setErrors(null);

    this.promotionForm.controls
      .size_prices
      .setErrors(null);

    const endsAtControl =
      this.promotionForm.controls
        .ends_at;

    if (
      endsAtControl.hasError(
        'afterStart',
      )
    ) {
      const errors = {
        ...endsAtControl.errors,
      };

      delete errors['afterStart'];

      endsAtControl.setErrors(
        Object.keys(errors).length >
          0
          ? errors
          : null,
      );
    }
  }

  private applyServerErrors(
    error: HttpErrorResponse,
  ): void {
    const response =
      error.error as
        | AdminPromotionValidationErrorResponse
        | undefined;

    const errors =
      response?.errors;

    if (!errors) {
      return;
    }

    for (
      const key
      of Object.keys(errors)
    ) {
      const rootField =
        key.split('.')[0];

      if (
        rootField in
        this.promotionForm.controls
      ) {
        const control =
          this.promotionForm.get(
            rootField,
          );

        control?.setErrors({
          server: errors[key],
        });

        control?.markAsTouched();
      }
    }
  }

  private defaultEndDate(): Date {
    const date =
      new Date();

    date.setFullYear(
      date.getFullYear() + 1,
    );

    return date;
  }

private toApiDate(
  value: Date,
): string {
  const year =
    value.getFullYear();

  const month =
    String(
      value.getMonth() + 1,
    ).padStart(2, '0');

  const day =
    String(
      value.getDate(),
    ).padStart(2, '0');

  const hours =
    String(
      value.getHours(),
    ).padStart(2, '0');

  const minutes =
    String(
      value.getMinutes(),
    ).padStart(2, '0');

  const seconds =
    String(
      value.getSeconds(),
    ).padStart(2, '0');

  return (
    `${year}-${month}-${day} ` +
    `${hours}:${minutes}:${seconds}`
  );
}

  private formatMoney(
    value: number,
  ): string {
    return new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      },
    ).format(value);
  }

  private formatDateTime(
    value: string,
  ): string {
    return new Intl.DateTimeFormat(
      'es-EC',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    ).format(
      new Date(value),
    );
  }

  private sortPromotions(
    promotions: AdminPromotion[],
  ): AdminPromotion[] {
    return [
      ...promotions,
    ].sort(
      (
        a,
        b,
      ) => {
        if (
          a.is_active !==
          b.is_active
        ) {
          return a.is_active
            ? -1
            : 1;
        }

        return a.name.localeCompare(
          b.name,
          'es',
        );
      },
    );
  }

  private errorMessage(
    error: HttpErrorResponse,
  ): string {
    const response =
      error.error as
        | AdminPromotionValidationErrorResponse
        | undefined;

    const errors =
      response?.errors;

    if (errors) {
      const firstErrorGroup =
        Object.values(
          errors,
        )[0];

      const firstValidationError =
        firstErrorGroup?.[0];

      if (
        typeof firstValidationError ===
        'string'
      ) {
        return firstValidationError;
      }
    }

    if (
      typeof response?.message ===
      'string'
    ) {
      return response.message;
    }

    return 'Ocurrió un error al comunicarse con el servidor.';
  }
}
