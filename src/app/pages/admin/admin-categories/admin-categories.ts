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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';

import {
  AdminCategory,
  AdminCategoryPayload,
  AdminSize,
  AdminSizePayload,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    SkeletonModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-categories.html',
  styleUrl: './admin-categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCategories {
  private readonly api = inject(AdminCatalogApiService);

  private readonly fb = inject(FormBuilder);

  private readonly messages = inject(MessageService);

  private readonly confirmation = inject(ConfirmationService);

  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly refreshing = signal(false);

  readonly savingCategory = signal(false);

  readonly savingSize = signal(false);

  readonly categories = signal<AdminCategory[]>([]);

  readonly sizes = signal<AdminSize[]>([]);

  readonly search = signal('');

  readonly categoryDialogVisible = signal(false);

  readonly sizeDialogVisible = signal(false);

  readonly editingCategory = signal<AdminCategory | null>(null);

  readonly editingSize = signal<AdminSize | null>(null);

  readonly categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],

    description: ['', [Validators.maxLength(2000)]],
  });

  readonly sizeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(60)]],

    portion: [1, [Validators.required, Validators.min(1), Validators.max(100)]],
  });

  readonly filteredCategories = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es');

    if (!query) {
      return this.categories();
    }

    return this.categories().filter((category) =>
      `${category.name} ${category.description ?? ''}`.toLocaleLowerCase('es').includes(query),
    );
  });

  readonly categoriesCount = computed(() => this.categories().length);

  readonly sizesCount = computed(() => this.sizes().length);

  readonly activePricesCount = computed(() =>
    this.categories().reduce((total, category) => total + category.prices_count, 0),
  );

  readonly pizzasCount = computed(() =>
    this.categories().reduce((total, category) => total + category.pizzas_count, 0),
  );

  constructor() {
    this.loadData();
  }

  loadData(showLoading = true): void {
    if (showLoading) {
      this.loading.set(true);
    }

    forkJoin({
      categories: this.api.categories(),

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
        next: (response) => {
          this.categories.set(response.categories.data ?? []);

          this.sizes.set(response.sizes.data ?? []);
        },

        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se cargó el catálogo',
            detail: this.errorMessage(error),
            life: 3600,
          });
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

  onSearch(value: string): void {
    this.search.set(value ?? '');
  }

  openNewCategory(): void {
    this.editingCategory.set(null);

    this.categoryForm.reset({
      name: '',
      description: '',
    });

    this.categoryDialogVisible.set(true);
  }

  openEditCategory(category: AdminCategory): void {
    this.editingCategory.set(category);

    this.categoryForm.reset({
      name: category.name,

      description: category.description ?? '',
    });

    this.categoryDialogVisible.set(true);
  }

  closeCategoryDialog(): void {
    if (this.savingCategory()) {
      return;
    }

    this.categoryDialogVisible.set(false);

    this.editingCategory.set(null);

    this.categoryForm.reset({
      name: '',
      description: '',
    });
  }

  saveCategory(): void {
    this.categoryForm.markAllAsTouched();

    if (this.categoryForm.invalid || this.savingCategory()) {
      return;
    }

    const value = this.categoryForm.getRawValue();

    const payload: AdminCategoryPayload = {
      name: value.name.trim(),

      description: value.description.trim() || null,
    };

    const editing = this.editingCategory();

    const request = editing
      ? this.api.updateCategory(editing.id, payload)
      : this.api.createCategory(payload);

    this.savingCategory.set(true);

    request
      .pipe(
        finalize(() => this.savingCategory.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const saved = response.data;

          this.categories.update((items) =>
            editing
              ? items.map((item) => (item.id === saved.id ? saved : item))
              : [...items, saved].sort((a, b) => a.name.localeCompare(b.name, 'es')),
          );

          this.messages.add({
            severity: 'success',

            summary: editing ? 'Categoría actualizada' : 'Categoría creada',

            detail: response.message,

            life: 2600,
          });

          this.closeCategoryDialog();
        },

        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',

            summary: 'No se guardó la categoría',

            detail: this.errorMessage(error),

            life: 3600,
          });
        },
      });
  }

  confirmDeleteCategory(category: AdminCategory): void {
    this.confirmation.confirm({
      header: 'Eliminar categoría',

      message: `¿Eliminar la categoría “${category.name}”? ` + 'Esta acción no se puede deshacer.',

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

      accept: () => this.deleteCategory(category),
    });
  }

  openNewSize(): void {
    this.editingSize.set(null);

    this.sizeForm.reset({
      name: '',
      portion: 1,
    });

    this.sizeDialogVisible.set(true);
  }

  openEditSize(size: AdminSize): void {
    this.editingSize.set(size);

    this.sizeForm.reset({
      name: size.name,
      portion: size.portion,
    });

    this.sizeDialogVisible.set(true);
  }

  closeSizeDialog(): void {
    if (this.savingSize()) {
      return;
    }

    this.sizeDialogVisible.set(false);

    this.editingSize.set(null);

    this.sizeForm.reset({
      name: '',
      portion: 1,
    });
  }

  saveSize(): void {
    this.sizeForm.markAllAsTouched();

    if (this.sizeForm.invalid || this.savingSize()) {
      return;
    }

    const value = this.sizeForm.getRawValue();

    const payload: AdminSizePayload = {
      name: value.name.trim(),

      portion: Number(value.portion),
    };

    const editing = this.editingSize();

    const request = editing
      ? this.api.updateSize(editing.id, payload)
      : this.api.createSize(payload);

    this.savingSize.set(true);

    request
      .pipe(
        finalize(() => this.savingSize.set(false)),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const saved = response.data;

          this.sizes.update((items) =>
            editing
              ? items.map((item) => (item.id === saved.id ? saved : item))
              : [...items, saved].sort((a, b) => a.portion - b.portion),
          );

          this.messages.add({
            severity: 'success',

            summary: editing ? 'Tamaño actualizado' : 'Tamaño creado',

            detail: response.message,

            life: 2600,
          });

          this.closeSizeDialog();
        },

        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',

            summary: 'No se guardó el tamaño',

            detail: this.errorMessage(error),

            life: 3600,
          });
        },
      });
  }

  confirmDeleteSize(size: AdminSize): void {
    this.confirmation.confirm({
      header: 'Eliminar tamaño',

      message:
        `¿Eliminar el tamaño “${size.name}”? ` +
        'Las relaciones de precios configuradas también se retirarán.',

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

      accept: () => this.deleteSize(size),
    });
  }

  categoryPriceLabel(category: AdminCategory): string {
    if (!category.size_prices.length) {
      return 'Sin precios configurados';
    }

    return category.size_prices
      .map(
        (price) => `${price.size?.name ?? `Tamaño ${price.size_id}`}: ${this.money(price.price)}`,
      )
      .join(' · ');
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  private deleteCategory(category: AdminCategory): void {
    this.api
      .deleteCategory(category.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.categories.update((items) => items.filter((item) => item.id !== category.id));

          this.messages.add({
            severity: 'success',
            summary: 'Categoría eliminada',
            detail: response.message,
            life: 2600,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se eliminó la categoría',
            detail: this.errorMessage(error),
            life: 4200,
          });
        },
      });
  }

  private deleteSize(size: AdminSize): void {
    this.api
      .deleteSize(size.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.sizes.update((items) => items.filter((item) => item.id !== size.id));

          this.categories.update((categories) =>
            categories.map((category) => ({
              ...category,

              prices_count: category.size_prices.filter((price) => price.size_id !== size.id)
                .length,

              size_prices: category.size_prices.filter((price) => price.size_id !== size.id),
            })),
          );

          this.messages.add({
            severity: 'success',
            summary: 'Tamaño eliminado',
            detail: response.message,
            life: 2600,
          });
        },

        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se eliminó el tamaño',
            detail: this.errorMessage(error),
            life: 4200,
          });
        },
      });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as AdminValidationErrorResponse | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object') {
      const first = Object.values(body.errors ?? {})
        .flat()
        .find(Boolean);

      return first ?? body.message ?? 'Ocurrió un problema procesando la solicitud.';
    }

    return error.message || 'Ocurrió un problema procesando la solicitud.';
  }
}
