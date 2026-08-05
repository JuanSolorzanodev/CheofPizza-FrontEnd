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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminIngredient,
  AdminIngredientPayload,
  AdminIngredientType,
  AdminSize,
  AdminUpdateIngredientPricesPayload,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';

type CatalogTab = 'ingredients' | 'types' | 'prices';

type UsageFilter = 'all' | 'protected' | 'deletable';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-ingredients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-ingredients.html',
  styleUrl: './admin-ingredients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredients {
  private readonly api = inject(AdminCatalogApiService);

  private readonly fb = inject(FormBuilder);

  private readonly messages = inject(MessageService);

  private readonly confirmation = inject(ConfirmationService);

  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly refreshing = signal(false);

  readonly savingIngredient = signal(false);

  readonly savingType = signal(false);

  readonly savingPrices = signal(false);

  readonly deletingIngredientId = signal<number | null>(null);

  readonly deletingTypeId = signal<number | null>(null);

  readonly activeTab = signal<CatalogTab>('ingredients');

  readonly ingredients = signal<AdminIngredient[]>([]);

  readonly ingredientTypes = signal<AdminIngredientType[]>([]);

  readonly sizes = signal<AdminSize[]>([]);

  readonly search = signal('');

  readonly selectedTypeId = signal<number | null>(null);

  readonly usageFilter = signal<UsageFilter>('all');

  readonly ingredientDialogVisible = signal(false);

  readonly typeDialogVisible = signal(false);

  readonly pricesDialogVisible = signal(false);

  readonly editingIngredient = signal<AdminIngredient | null>(null);

  readonly editingType = signal<AdminIngredientType | null>(null);

  readonly pricingIngredient = signal<AdminIngredient | null>(null);

  readonly typeFilterOptions = computed<SelectOption<number | null>[]>(() => [
    {
      label: 'Todos los tipos',
      value: null,
    },

    ...this.ingredientTypes().map((type) => ({
      label: type.name,
      value: type.id,
    })),
  ]);

  readonly usageOptions: SelectOption<UsageFilter>[] = [
    {
      label: 'Todos los estados',
      value: 'all',
    },
    {
      label: 'Protegidos',
      value: 'protected',
    },
    {
      label: 'Se pueden eliminar',
      value: 'deletable',
    },
  ];

  readonly totalIngredients = computed(() => this.ingredients().length);

  readonly totalTypes = computed(() => this.ingredientTypes().length);

  readonly protectedIngredients = computed(
    () => this.ingredients().filter((ingredient) => !ingredient.can_delete).length,
  );

  readonly configuredPrices = computed(() =>
    this.ingredients().reduce((total, ingredient) => total + ingredient.prices.length, 0),
  );

  readonly filteredIngredients = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es');

    const typeId = this.selectedTypeId();

    const usage = this.usageFilter();

    return this.ingredients().filter((ingredient) => {
      const matchesSearch =
        !query ||
        ingredient.name.toLocaleLowerCase('es').includes(query) ||
        ingredient.type.name.toLocaleLowerCase('es').includes(query);

      const matchesType = typeId === null || ingredient.ingredient_type_id === typeId;

      const matchesUsage =
        usage === 'all' ||
        (usage === 'protected' && !ingredient.can_delete) ||
        (usage === 'deletable' && ingredient.can_delete);

      return matchesSearch && matchesType && matchesUsage;
    });
  });

  readonly ingredientForm = this.fb.nonNullable.group({
    ingredient_type_id: [0, [Validators.required, Validators.min(1)]],

    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
  });

  readonly typeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });

  readonly pricesForm = this.fb.nonNullable.group({
    prices: this.fb.array([]),
  });

  get priceRows(): FormArray {
    return this.pricesForm.controls.prices;
  }

  constructor() {
    this.loadData();
  }

  loadData(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }

    forkJoin({
      ingredients: this.api.ingredients(),

      types: this.api.ingredientTypes(),

      sizes: this.api.sizes(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ ingredients, types, sizes }) => {
          this.ingredients.set(ingredients.data ?? []);

          this.ingredientTypes.set(types.data ?? []);

          this.sizes.set([...(sizes.data ?? [])].sort((a, b) => a.portion - b.portion));
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se cargó el catálogo', error);
        },
      });
  }

  refresh(): void {
    if (this.refreshing()) {
      return;
    }

    this.refreshing.set(true);
    this.loadData(false);
  }

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedTypeId.set(null);
    this.usageFilter.set('all');
  }

  openNewIngredient(): void {
    this.editingIngredient.set(null);

    this.ingredientForm.reset({
      ingredient_type_id: this.ingredientTypes()[0]?.id ?? 0,

      name: '',
    });

    this.ingredientDialogVisible.set(true);
  }

  openEditIngredient(ingredient: AdminIngredient): void {
    this.editingIngredient.set(ingredient);

    this.ingredientForm.reset({
      ingredient_type_id: ingredient.ingredient_type_id,

      name: ingredient.name,
    });

    this.ingredientDialogVisible.set(true);
  }

  closeIngredientDialog(): void {
    if (this.savingIngredient()) {
      return;
    }

    this.resetIngredientDialog();
  }

  saveIngredient(): void {
    this.ingredientForm.markAllAsTouched();

    if (this.ingredientForm.invalid || this.savingIngredient()) {
      return;
    }

    const raw = this.ingredientForm.getRawValue();

    const payload: AdminIngredientPayload = {
      ingredient_type_id: Number(raw.ingredient_type_id),

      name: raw.name.trim(),
    };

    const editing = this.editingIngredient();

    const request = editing
      ? this.api.updateIngredient(editing.id, payload)
      : this.api.createIngredient(payload);

    this.savingIngredient.set(true);

    request
      .pipe(
        finalize(() => this.savingIngredient.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.upsertIngredient(response.data);

          this.resetIngredientDialog();

          this.messages.add({
            severity: 'success',

            summary: editing ? 'Ingrediente actualizado' : 'Ingrediente creado',

            detail: response.message,

            life: 3000,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se guardó el ingrediente', error);
        },
      });
  }

  openNewType(): void {
    this.editingType.set(null);

    this.typeForm.reset({
      name: '',
    });

    this.typeDialogVisible.set(true);
  }

  openEditType(type: AdminIngredientType): void {
    this.editingType.set(type);

    this.typeForm.reset({
      name: type.name,
    });

    this.typeDialogVisible.set(true);
  }

  closeTypeDialog(): void {
    if (this.savingType()) {
      return;
    }

    this.resetTypeDialog();
  }

  saveType(): void {
    this.typeForm.markAllAsTouched();

    if (this.typeForm.invalid || this.savingType()) {
      return;
    }

    const payload = {
      name: this.typeForm.controls.name.value.trim(),
    };

    const editing = this.editingType();

    const request = editing
      ? this.api.updateIngredientType(editing.id, payload)
      : this.api.createIngredientType(payload);

    this.savingType.set(true);

    request
      .pipe(
        finalize(() => this.savingType.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.ingredientTypes.update((items) =>
            (editing
              ? items.map((item) => (item.id === response.data.id ? response.data : item))
              : [...items, response.data]
            ).sort((a, b) => a.name.localeCompare(b.name, 'es')),
          );

          this.ingredients.update((items) =>
            items.map((ingredient) => {
              if (ingredient.ingredient_type_id !== response.data.id) {
                return ingredient;
              }

              return {
                ...ingredient,

                type: {
                  ...ingredient.type,
                  name: response.data.name,
                },
              };
            }),
          );

          this.resetTypeDialog();

          this.messages.add({
            severity: 'success',

            summary: editing ? 'Tipo actualizado' : 'Tipo creado',

            detail: response.message,

            life: 3000,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se guardó el tipo', error);
        },
      });
  }

  openPrices(ingredient: AdminIngredient): void {
    this.pricingIngredient.set(ingredient);

    this.priceRows.clear();

    for (const size of this.sizes()) {
      const existing = ingredient.prices.find((price) => price.size_id === size.id);

      this.priceRows.push(
        this.fb.nonNullable.group({
          size_id: [size.id],

          size_name: [size.name],

          portion: [size.portion],

          extra_price: [
            existing?.extra_price ?? 0,
            [Validators.required, Validators.min(0), Validators.max(999999.99)],
          ],
        }),
      );
    }

    this.pricesDialogVisible.set(true);
  }

  closePricesDialog(): void {
    if (this.savingPrices()) {
      return;
    }

    this.resetPricesDialog();
  }

  savePrices(): void {
    this.pricesForm.markAllAsTouched();

    const ingredient = this.pricingIngredient();

    if (!ingredient || this.pricesForm.invalid || this.savingPrices()) {
      return;
    }

    const payload: AdminUpdateIngredientPricesPayload = {
      prices: this.priceRows.controls.map((control) => {
        const value = control.getRawValue();

        return {
          size_id: Number(value.size_id),

          extra_price: Number(value.extra_price),
        };
      }),
    };

    this.savingPrices.set(true);

    this.api
      .updateIngredientPrices(ingredient.id, payload)
      .pipe(
        finalize(() => this.savingPrices.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.ingredients.update((items) =>
            items.map((item) =>
              item.id === ingredient.id
                ? {
                    ...item,

                    prices: response.data,

                    usage: {
                      ...item.usage,

                      prices: response.data.length,
                    },
                  }
                : item,
            ),
          );

          this.resetPricesDialog();

          this.messages.add({
            severity: 'success',
            summary: 'Precios actualizados',
            detail: response.message,
            life: 3000,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se guardaron los precios', error);
        },
      });
  }

  confirmDeleteIngredient(ingredient: AdminIngredient): void {
    if (!ingredient.can_delete) {
      this.messages.add({
        severity: 'warn',
        summary: 'Ingrediente protegido',
        detail: 'Está asociado a pizzas, carritos o pedidos y no puede eliminarse.',
        life: 4000,
      });

      return;
    }

    this.confirmation.confirm({
      header: 'Eliminar ingrediente',

      message: `¿Eliminar definitivamente “${ingredient.name}” y sus precios configurados?`,

      icon: 'pi pi-exclamation-triangle',

      acceptLabel: 'Eliminar',

      rejectLabel: 'Cancelar',

      acceptButtonProps: {
        severity: 'danger',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () => this.deleteIngredient(ingredient),
    });
  }

  confirmDeleteType(type: AdminIngredientType): void {
    if (!type.can_delete) {
      this.messages.add({
        severity: 'warn',
        summary: 'Tipo protegido',
        detail: 'Primero debes reasignar o eliminar los ingredientes de este tipo.',
        life: 4000,
      });

      return;
    }

    this.confirmation.confirm({
      header: 'Eliminar tipo',

      message: `¿Eliminar definitivamente el tipo “${type.name}”?`,

      icon: 'pi pi-exclamation-triangle',

      acceptLabel: 'Eliminar',

      rejectLabel: 'Cancelar',

      acceptButtonProps: {
        severity: 'danger',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () => this.deleteType(type),
    });
  }

  usageText(ingredient: AdminIngredient): string {
    const parts: string[] = [];

    const pizzas = ingredient.usage.pizzas;

    const carts = ingredient.usage.cart_personalizations;

    const orders = ingredient.usage.order_personalizations;

    if (pizzas > 0) {
      parts.push(`${pizzas} ${pizzas === 1 ? 'pizza' : 'pizzas'}`);
    }

    if (carts > 0) {
      parts.push(`${carts} ${carts === 1 ? 'carrito' : 'carritos'}`);
    }

    if (orders > 0) {
      parts.push(`${orders} ${orders === 1 ? 'pedido' : 'pedidos'}`);
    }

    return parts.length ? parts.join(' · ') : 'Sin asociaciones';
  }

  priceRange(ingredient: AdminIngredient): string {
    if (!ingredient.prices.length) {
      return 'Sin precios';
    }

    const values = ingredient.prices.map((price) => Number(price.extra_price));

    const min = Math.min(...values);

    const max = Math.max(...values);

    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }

  priceForSize(ingredient: AdminIngredient, sizeId: number): number {
    return Number(ingredient.prices.find((price) => price.size_id === sizeId)?.extra_price ?? 0);
  }

  private upsertIngredient(ingredient: AdminIngredient): void {
    this.ingredients.update((items) => {
      const exists = items.some((item) => item.id === ingredient.id);

      return (
        exists
          ? items.map((item) => (item.id === ingredient.id ? ingredient : item))
          : [...items, ingredient]
      ).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    });

    this.recalculateTypeCounters();
  }

  private deleteIngredient(ingredient: AdminIngredient): void {
    if (this.deletingIngredientId() !== null) {
      return;
    }

    this.deletingIngredientId.set(ingredient.id);

    this.api
      .deleteIngredient(ingredient.id)
      .pipe(
        finalize(() => this.deletingIngredientId.set(null)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.ingredients.update((items) => items.filter((item) => item.id !== ingredient.id));

          this.recalculateTypeCounters();

          this.messages.add({
            severity: 'success',
            summary: 'Ingrediente eliminado',
            detail: response.message,
            life: 3000,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se eliminó el ingrediente', error);
        },
      });
  }

  private deleteType(type: AdminIngredientType): void {
    if (this.deletingTypeId() !== null) {
      return;
    }

    this.deletingTypeId.set(type.id);

    this.api
      .deleteIngredientType(type.id)
      .pipe(
        finalize(() => this.deletingTypeId.set(null)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.ingredientTypes.update((items) => items.filter((item) => item.id !== type.id));

          if (this.selectedTypeId() === type.id) {
            this.selectedTypeId.set(null);
          }

          this.messages.add({
            severity: 'success',
            summary: 'Tipo eliminado',
            detail: response.message,
            life: 3000,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.showError('No se eliminó el tipo', error);
        },
      });
  }

  private recalculateTypeCounters(): void {
    const ingredients = this.ingredients();

    this.ingredientTypes.update((types) =>
      types.map((type) => {
        const count = ingredients.filter(
          (ingredient) => ingredient.ingredient_type_id === type.id,
        ).length;

        return {
          ...type,
          ingredients_count: count,
          can_delete: count === 0,
        };
      }),
    );
  }

  private resetIngredientDialog(): void {
    this.ingredientDialogVisible.set(false);

    this.editingIngredient.set(null);

    this.ingredientForm.reset({
      ingredient_type_id: 0,
      name: '',
    });
  }

  private resetTypeDialog(): void {
    this.typeDialogVisible.set(false);
    this.editingType.set(null);

    this.typeForm.reset({
      name: '',
    });
  }

  private resetPricesDialog(): void {
    this.pricesDialogVisible.set(false);
    this.pricingIngredient.set(null);
    this.priceRows.clear();
  }

  private showError(summary: string, error: HttpErrorResponse): void {
    this.messages.add({
      severity: 'error',
      summary,
      detail: this.errorMessage(error),
      life: 4500,
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as AdminValidationErrorResponse | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      return (
        Object.values(body.errors ?? {})
          .flat()
          .find(Boolean) ??
        body.message ??
        'Ocurrió un problema procesando la solicitud.'
      );
    }

    return error.message || 'Ocurrió un problema procesando la solicitud.';
  }
}
