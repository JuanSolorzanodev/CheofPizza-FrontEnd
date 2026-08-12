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
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { MessageService } from 'primeng/api';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminCategory,
  AdminPizza,
  AdminPizzaPayload,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import { IngredientDto } from '../../../core/api/catalog/catalog.models';

interface IngredientOption {
  label: string;
  value: number;
  typeName: string;
}

export interface AdminPizzaEditorSavedEvent {
  pizza: AdminPizza;
  editing: boolean;
}

@Component({
  selector: 'app-admin-pizza-editor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
  ],
  templateUrl: './admin-pizza-editor.html',
  styleUrl: './admin-pizza-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPizzaEditorComponent {
  private readonly adminCatalogApi =
    inject(AdminCatalogApiService);

  private readonly fb =
    inject(FormBuilder);

  private readonly messages =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly visible =
    input.required<boolean>();

  readonly pizza =
    input<AdminPizza | null>(null);

  readonly categories =
    input.required<AdminCategory[]>();

  readonly ingredients =
    input.required<IngredientDto[]>();

  readonly closed =
    output<void>();

  readonly saved =
    output<AdminPizzaEditorSavedEvent>();

  readonly savingChange =
    output<boolean>();

  readonly saving =
    signal(false);

  readonly imagePreviewError =
    signal(false);

  readonly ingredientOptions =
    signal<IngredientOption[]>([]);

  private initializedFor:
    string | null = null;

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
    effect(() => {
      const visible =
        this.visible();

      const pizza =
        this.pizza();

      const categories =
        this.categories();

      const ingredients =
        this.ingredients();

      this.ingredientOptions.set(
        ingredients
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

      if (!visible) {
        this.initializedFor = null;
        return;
      }

      const key =
        pizza
          ? `edit:${pizza.id}`
          : 'new';

      if (
        this.initializedFor === key
      ) {
        return;
      }

      this.initializedFor = key;
      this.imagePreviewError.set(false);

      this.pizzaForm.reset({
        category_id:
          pizza?.category_id ??
          categories[0]?.id ??
          0,

        name:
          pizza?.name ?? '',

        description:
          pizza?.description ?? '',

        image_url:
          pizza?.image_url ?? '',

        ingredient_ids:
          pizza
            ? pizza.ingredients.map(
                ingredient =>
                  ingredient.id,
              )
            : [],

        is_visible:
          pizza?.is_visible ?? true,
      });
    });
  }

  onVisibleChange(
    visible: boolean,
  ): void {
    if (visible) {
      return;
    }

    this.close();
  }

  close(): void {
    if (this.saving()) {
      return;
    }

    this.initializedFor = null;
    this.closed.emit();
  }

  savePizza(): void {
    this.pizzaForm.markAllAsTouched();

    const ingredientIds =
      this.pizzaForm.controls
        .ingredient_ids.value;

    if (!ingredientIds.length) {
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
      this.pizza();

    const request = editing
      ? this.adminCatalogApi.updatePizza(
          editing.id,
          payload,
        )
      : this.adminCatalogApi.createPizza(
          payload,
        );

    this.setSaving(true);

    request
      .pipe(
        finalize(() =>
          this.setSaving(false),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.messages.add({
            severity: 'success',
            summary: editing
              ? 'Pizza actualizada'
              : 'Pizza creada',
            detail:
              response.message,
            life: 3000,
          });

          this.saved.emit({
            pizza: response.data,
            editing: Boolean(editing),
          });

          this.initializedFor = null;
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

  imageUrl(): string {
    return (
      this.pizzaForm.controls
        .image_url.value
        .trim()
    );
  }

  private setSaving(
    saving: boolean,
  ): void {
    this.saving.set(saving);
    this.savingChange.emit(saving);
  }

  private errorMessage(
    error: HttpErrorResponse,
  ): string {
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

      if (firstError) {
        return firstError;
      }

      if (
        typeof body.message ===
          'string' &&
        body.message.trim()
      ) {
        return body.message;
      }
    }

    return (
      error.message ||
      'Ocurrió un error inesperado.'
    );
  }
}
