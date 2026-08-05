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
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';

import {
  ConfirmationService,
  MessageService,
} from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminCategory,
  AdminPizza,
  AdminPizzaPayload,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import {
  IngredientDto,
} from '../../../core/api/catalog/catalog.models';

interface SelectOption<T = number | string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-pizzas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
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
  templateUrl: './admin-pizzas.html',
  styleUrl: './admin-pizzas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPizzas {
  private readonly adminCatalogApi =
    inject(AdminCatalogApiService);

  private readonly publicCatalogApi =
    inject(CatalogApiService);

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

  readonly changingVisibilityId =
    signal<number | null>(null);

  readonly deletingId =
    signal<number | null>(null);

  readonly pizzas =
    signal<AdminPizza[]>([]);

  readonly categories =
    signal<AdminCategory[]>([]);

  readonly ingredients =
    signal<IngredientDto[]>([]);

  readonly search =
    signal('');

  readonly selectedCategoryId =
    signal<number | null>(null);

  readonly selectedVisibility =
    signal<'all' | 'visible' | 'hidden'>('all');

  readonly dialogVisible =
    signal(false);

  readonly editingPizza =
    signal<AdminPizza | null>(null);

  readonly imagePreviewError =
    signal(false);

  readonly categoryOptions =
    computed<SelectOption<number | null>[]>(() => [
      {
        label: 'Todas las categorías',
        value: null,
      },
      ...this.categories().map(category => ({
        label: category.name,
        value: category.id,
      })),
    ]);

  readonly visibilityOptions =
    signal<SelectOption<'all' | 'visible' | 'hidden'>[]>([
      {
        label: 'Toda visibilidad',
        value: 'all',
      },
      {
        label: 'Visibles',
        value: 'visible',
      },
      {
        label: 'Ocultas',
        value: 'hidden',
      },
    ]);

  readonly ingredientOptions =
    computed(() =>
      this.ingredients()
        .map(ingredient => ({
          label: ingredient.type?.name
            ? `${ingredient.name} · ${ingredient.type.name}`
            : ingredient.name,

          value: ingredient.id,

          typeName:
            ingredient.type?.name ??
            'Sin tipo',
        }))
        .sort((a, b) =>
          a.label.localeCompare(
            b.label,
            'es',
          ),
        ),
    );

  readonly totalPizzas =
    computed(
      () => this.pizzas().length,
    );

  readonly visiblePizzas =
    computed(
      () =>
        this.pizzas().filter(
          pizza => pizza.is_visible,
        ).length,
    );

  readonly hiddenPizzas =
    computed(
      () =>
        this.pizzas().filter(
          pizza => !pizza.is_visible,
        ).length,
    );

  readonly protectedPizzas =
    computed(
      () =>
        this.pizzas().filter(
          pizza => !pizza.can_delete,
        ).length,
    );

  readonly filteredPizzas =
    computed(() => {
      const query =
        this.search()
          .trim()
          .toLocaleLowerCase('es');

      const categoryId =
        this.selectedCategoryId();

      const visibility =
        this.selectedVisibility();

      return this.pizzas().filter(
        pizza => {
          const matchesSearch =
            !query ||
            [
              pizza.name,
              pizza.description ?? '',
              pizza.category?.name ?? '',
              ...pizza.ingredients.map(
                ingredient =>
                  ingredient.name,
              ),
            ]
              .join(' ')
              .toLocaleLowerCase('es')
              .includes(query);

          const matchesCategory =
            categoryId === null ||
            pizza.category_id ===
              categoryId;

          const matchesVisibility =
            visibility === 'all' ||
            (
              visibility === 'visible' &&
              pizza.is_visible
            ) ||
            (
              visibility === 'hidden' &&
              !pizza.is_visible
            );

          return (
            matchesSearch &&
            matchesCategory &&
            matchesVisibility
          );
        },
      );
    });

  readonly pizzaForm =
    this.fb.nonNullable.group({
      category_id: [
        0,
        [
          Validators.required,
          Validators.min(1),
        ],
      ],

      name: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(150),
        ],
      ],

      description: [
        '',
        [
          Validators.maxLength(3000),
        ],
      ],

      image_url: [
        '',
        [
          Validators.maxLength(2048),
          Validators.pattern(
            /^https?:\/\/.+/i,
          ),
        ],
      ],

      ingredient_ids: [
        [] as number[],
        [
          Validators.required,
        ],
      ],

      is_visible: [
        true,
      ],
    });

  constructor() {
    this.loadData();
  }

  loadData(
    showMainLoading = true,
  ): void {
    if (showMainLoading) {
      this.loading.set(true);
    }

    forkJoin({
      pizzas:
        this.adminCatalogApi.pizzas(),

      categories:
        this.adminCatalogApi.categories(),

      ingredients:
        this.publicCatalogApi.getIngredients(),
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
          this.pizzas.set(
            response.pizzas.data ?? [],
          );

          this.categories.set(
            response.categories.data ?? [],
          );

          this.ingredients.set(
            response.ingredients ?? [],
          );
        },

        error: (
          error: HttpErrorResponse | Error,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se cargaron las pizzas',
            detail:
              this.errorMessage(error),
            life: 4200,
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
    this.selectedCategoryId.set(null);
    this.selectedVisibility.set('all');
  }

  openNewPizza(): void {
    this.editingPizza.set(null);
    this.imagePreviewError.set(false);

    this.pizzaForm.reset({
      category_id:
        this.categories()[0]?.id ?? 0,

      name: '',

      description: '',

      image_url: '',

      ingredient_ids: [],

      is_visible: true,
    });

    this.dialogVisible.set(true);
  }

  openEditPizza(
    pizza: AdminPizza,
  ): void {
    this.editingPizza.set(pizza);
    this.imagePreviewError.set(false);

    this.pizzaForm.reset({
      category_id:
        pizza.category_id,

      name:
        pizza.name,

      description:
        pizza.description ?? '',

      image_url:
        pizza.image_url ?? '',

      ingredient_ids:
        pizza.ingredients.map(
          ingredient =>
            ingredient.id,
        ),

      is_visible:
        pizza.is_visible,
    });

    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    if (visible) {
      this.dialogVisible.set(true);
      return;
    }

    this.closeDialog();
  }

  closeDialog(): void {
    if (this.saving()) {
      return;
    }

    this.resetDialog();
  }

  savePizza(): void {
    this.pizzaForm.markAllAsTouched();

    const ingredientIds =
      this.pizzaForm.controls
        .ingredient_ids.value;

    if (
      !ingredientIds.length
    ) {
      this.pizzaForm.controls
        .ingredient_ids
        .setErrors({
          required: true,
        });
    }

    if (
      this.pizzaForm.invalid ||
      this.saving()
    ) {
      return;
    }

    const value =
      this.pizzaForm.getRawValue();

    const payload:
      AdminPizzaPayload = {
        category_id:
          Number(value.category_id),

        name:
          value.name.trim(),

        description:
          value.description.trim() ||
          null,

        image_url:
          value.image_url.trim() ||
          null,

        ingredient_ids:
          value.ingredient_ids.map(
            id => Number(id),
          ),

        is_visible:
          Boolean(value.is_visible),
      };

    const editing =
      this.editingPizza();

    const request = editing
      ? this.adminCatalogApi.updatePizza(
          editing.id,
          payload,
        )
      : this.adminCatalogApi.createPizza(
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

          this.pizzas.update(
            current =>
              editing
                ? current
                    .map(pizza =>
                      pizza.id ===
                      saved.id
                        ? saved
                        : pizza,
                    )
                    .sort(
                      (a, b) =>
                        a.name.localeCompare(
                          b.name,
                          'es',
                        ),
                    )
                : [
                    ...current,
                    saved,
                  ].sort(
                    (a, b) =>
                      a.name.localeCompare(
                        b.name,
                        'es',
                      ),
                  ),
          );

          this.messages.add({
            severity: 'success',
            summary: editing
              ? 'Pizza actualizada'
              : 'Pizza creada',
            detail:
              response.message,
            life: 3000,
          });

          this.resetDialog();
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se guardó la pizza',
            detail:
              this.errorMessage(error),
            life: 4500,
          });
        },
      });
  }

  confirmVisibility(
    pizza: AdminPizza,
  ): void {
    const willBeVisible =
      !pizza.is_visible;

    this.confirmation.confirm({
      header: willBeVisible
        ? 'Mostrar pizza'
        : 'Ocultar pizza',

      message: willBeVisible
        ? `¿Mostrar “${pizza.name}” nuevamente en el catálogo público?`
        : `¿Ocultar “${pizza.name}” del catálogo público? Los pedidos históricos no serán afectados.`,

      icon: willBeVisible
        ? 'pi pi-eye'
        : 'pi pi-eye-slash',

      acceptLabel: willBeVisible
        ? 'Mostrar'
        : 'Ocultar',

      rejectLabel:
        'Cancelar',

      acceptButtonProps: {
        severity: willBeVisible
          ? 'success'
          : 'warn',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () =>
        this.updateVisibility(
          pizza,
          willBeVisible,
        ),
    });
  }

  confirmDelete(
    pizza: AdminPizza,
  ): void {
    if (!pizza.can_delete) {
      this.messages.add({
        severity: 'warn',
        summary:
          'Pizza protegida',
        detail:
          'Esta pizza tiene registros asociados. Debes ocultarla en lugar de eliminarla.',
        life: 4200,
      });

      return;
    }

    this.confirmation.confirm({
      header:
        'Eliminar pizza',

      message:
        `¿Eliminar definitivamente “${pizza.name}”? Esta acción no se puede deshacer.`,

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
        this.deletePizza(pizza),
    });
  }

  imageUrl(): string {
    return (
      this.pizzaForm.controls
        .image_url.value
        .trim()
    );
  }

  ingredientNames(
    pizza: AdminPizza,
  ): string {
    if (!pizza.ingredients.length) {
      return 'Sin ingredientes';
    }

    return pizza.ingredients
      .map(
        ingredient =>
          ingredient.name,
      )
      .join(', ');
  }

  usageLabel(
    pizza: AdminPizza,
  ): string {
    const total =
      pizza.usage?.total ?? 0;

    if (total === 0) {
      return 'Sin uso registrado';
    }

    return total === 1
      ? '1 registro asociado'
      : `${total} registros asociados`;
  }

  trackPizza(
    _: number,
    pizza: AdminPizza,
  ): number {
    return pizza.id;
  }

  private updateVisibility(
    pizza: AdminPizza,
    isVisible: boolean,
  ): void {
    if (
      this.changingVisibilityId() !==
      null
    ) {
      return;
    }

    this.changingVisibilityId.set(
      pizza.id,
    );

    this.adminCatalogApi
      .updatePizzaVisibility(
        pizza.id,
        {
          is_visible: isVisible,
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
          const updated =
            response.data;

          this.pizzas.update(
            current =>
              current.map(item =>
                item.id === updated.id
                  ? updated
                  : item,
              ),
          );

          this.messages.add({
            severity: 'success',
            summary: isVisible
              ? 'Pizza visible'
              : 'Pizza oculta',
            detail:
              response.message,
            life: 2800,
          });
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se cambió la visibilidad',
            detail:
              this.errorMessage(error),
            life: 4200,
          });
        },
      });
  }

  private deletePizza(
    pizza: AdminPizza,
  ): void {
    if (
      this.deletingId() !== null
    ) {
      return;
    }

    this.deletingId.set(
      pizza.id,
    );

    this.adminCatalogApi
      .deletePizza(pizza.id)
      .pipe(
        finalize(() =>
          this.deletingId.set(null),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.pizzas.update(
            current =>
              current.filter(
                item =>
                  item.id !==
                  pizza.id,
              ),
          );

          this.messages.add({
            severity: 'success',
            summary:
              'Pizza eliminada',
            detail:
              response.message,
            life: 2800,
          });
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',
            summary:
              'No se eliminó la pizza',
            detail:
              this.errorMessage(error),
            life: 4500,
          });
        },
      });
  }

  private resetDialog(): void {
    this.dialogVisible.set(false);
    this.editingPizza.set(null);
    this.imagePreviewError.set(false);

    this.pizzaForm.reset({
      category_id: 0,
      name: '',
      description: '',
      image_url: '',
      ingredient_ids: [],
      is_visible: true,
    });
  }

  private errorMessage(
    error: HttpErrorResponse | Error,
  ): string {
    if (
      error instanceof HttpErrorResponse
    ) {
      const body =
        error.error as
          | AdminValidationErrorResponse
          | string
          | null;

      if (
        typeof body === 'string' &&
        body.trim()
      ) {
        return body;
      }

      if (
        body &&
        typeof body === 'object'
      ) {
        const firstError =
          Object.values(
            body.errors ?? {},
          )
            .flat()
            .find(Boolean);

        return (
          firstError ??
          body.message ??
          'Ocurrió un problema procesando la solicitud.'
        );
      }

      return (
        error.message ||
        'Ocurrió un problema procesando la solicitud.'
      );
    }

    return (
      error.message ||
      'Ocurrió un problema procesando la solicitud.'
    );
  }
}
