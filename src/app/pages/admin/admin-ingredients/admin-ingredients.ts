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
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminIngredient,
  AdminIngredientType,
  AdminSize,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import { AdminIngredientCardComponent } from '../../../shared/components/admin-ingredient-card/admin-ingredient-card';
import { AdminIngredientFormDialogComponent } from '../../../shared/components/admin-ingredient-form-dialog/admin-ingredient-form-dialog';
import {
  AdminIngredientPricesDialogComponent,
  AdminIngredientPricesSavedEvent,
} from '../../../shared/components/admin-ingredient-prices-dialog/admin-ingredient-prices-dialog';
import { AdminIngredientTypeDialogComponent } from '../../../shared/components/admin-ingredient-type-dialog/admin-ingredient-type-dialog';
import { AdminIngredientTypeRowComponent } from '../../../shared/components/admin-ingredient-type-row/admin-ingredient-type-row';

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
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    TagModule,
    AdminIngredientCardComponent,
    AdminIngredientTypeRowComponent,
    AdminIngredientFormDialogComponent,
    AdminIngredientTypeDialogComponent,
    AdminIngredientPricesDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-ingredients.html',
  styleUrl: './admin-ingredients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredients {
  private readonly api = inject(AdminCatalogApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly deletingIngredientId = signal<number | null>(null);
  readonly deletingTypeId = signal<number | null>(null);
  readonly dialogSaving = signal(false);

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
    { label: 'Todos los tipos', value: null },
    ...this.ingredientTypes().map((type) => ({ label: type.name, value: type.id })),
  ]);

  readonly usageOptions: SelectOption<UsageFilter>[] = [
    { label: 'Todos los estados', value: 'all' },
    { label: 'Protegidos', value: 'protected' },
    { label: 'Se pueden eliminar', value: 'deletable' },
  ];

  readonly totalIngredients = computed(() => this.ingredients().length);
  readonly totalTypes = computed(() => this.ingredientTypes().length);
  readonly protectedIngredients = computed(
    () => this.ingredients().filter((ingredient) => !ingredient.can_delete).length,
  );
  readonly configuredPrices = computed(() =>
    this.ingredients().reduce((total, ingredient) => total + ingredient.prices.length, 0),
  );
  readonly actionsBusy = computed(
    () =>
      this.dialogSaving() || this.deletingIngredientId() !== null || this.deletingTypeId() !== null,
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

  constructor() {
    this.loadData();
  }

  loadData(showLoading = true): void {
    if (showLoading) this.loading.set(true);

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
        error: (error: HttpErrorResponse) => this.showError('No se cargó el catálogo', error),
      });
  }

  refresh(): void {
    if (this.refreshing()) return;
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
    this.ingredientDialogVisible.set(true);
  }
  openEditIngredient(ingredient: AdminIngredient): void {
    this.editingIngredient.set(ingredient);
    this.ingredientDialogVisible.set(true);
  }
  onIngredientDialogVisibleChange(visible: boolean): void {
    this.ingredientDialogVisible.set(visible);
    if (!visible) this.editingIngredient.set(null);
  }
  onIngredientSaved(ingredient: AdminIngredient): void {
    this.upsertIngredient(ingredient);
  }

  openNewType(): void {
    this.editingType.set(null);
    this.typeDialogVisible.set(true);
  }
  openEditType(type: AdminIngredientType): void {
    this.editingType.set(type);
    this.typeDialogVisible.set(true);
  }
  onTypeDialogVisibleChange(visible: boolean): void {
    this.typeDialogVisible.set(visible);
    if (!visible) this.editingType.set(null);
  }
  onTypeSaved(type: AdminIngredientType): void {
    this.ingredientTypes.update((items) => {
      const exists = items.some((item) => item.id === type.id);
      return (
        exists ? items.map((item) => (item.id === type.id ? type : item)) : [...items, type]
      ).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    });
    this.ingredients.update((items) =>
      items.map((ingredient) =>
        ingredient.ingredient_type_id === type.id
          ? { ...ingredient, type: { ...ingredient.type, name: type.name } }
          : ingredient,
      ),
    );
  }

  openPrices(ingredient: AdminIngredient): void {
    this.pricingIngredient.set(ingredient);
    this.pricesDialogVisible.set(true);
  }
  onPricesDialogVisibleChange(visible: boolean): void {
    this.pricesDialogVisible.set(visible);
    if (!visible) this.pricingIngredient.set(null);
  }
  onPricesSaved(event: AdminIngredientPricesSavedEvent): void {
    this.ingredients.update((items) =>
      items.map((item) =>
        item.id === event.ingredientId
          ? { ...item, prices: event.prices, usage: { ...item.usage, prices: event.prices.length } }
          : item,
      ),
    );
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
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
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
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.deleteType(type),
    });
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
    if (this.deletingIngredientId() !== null) return;
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
        error: (error: HttpErrorResponse) => this.showError('No se eliminó el ingrediente', error),
      });
  }

  private deleteType(type: AdminIngredientType): void {
    if (this.deletingTypeId() !== null) return;
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
          if (this.selectedTypeId() === type.id) this.selectedTypeId.set(null);
          this.messages.add({
            severity: 'success',
            summary: 'Tipo eliminado',
            detail: response.message,
            life: 3000,
          });
        },
        error: (error: HttpErrorResponse) => this.showError('No se eliminó el tipo', error),
      });
  }

  private recalculateTypeCounters(): void {
    const ingredients = this.ingredients();
    this.ingredientTypes.update((types) =>
      types.map((type) => {
        const count = ingredients.filter(
          (ingredient) => ingredient.ingredient_type_id === type.id,
        ).length;
        return { ...type, ingredients_count: count, can_delete: count === 0 };
      }),
    );
  }

  private showError(summary: string, error: HttpErrorResponse): void {
    this.messages.add({ severity: 'error', summary, detail: this.errorMessage(error), life: 4500 });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as AdminValidationErrorResponse | string | null;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object')
      return (
        Object.values(body.errors ?? {})
          .flat()
          .find(Boolean) ??
        body.message ??
        'Ocurrió un problema procesando la solicitud.'
      );
    return error.message || 'Ocurrió un problema procesando la solicitud.';
  }
}
