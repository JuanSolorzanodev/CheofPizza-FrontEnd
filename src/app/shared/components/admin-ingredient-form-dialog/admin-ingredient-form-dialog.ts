import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import { AdminIngredient, AdminIngredientPayload, AdminIngredientType, AdminValidationErrorResponse } from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-ingredient-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './admin-ingredient-form-dialog.html',
  styleUrl: './admin-ingredient-form-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredientFormDialogComponent {
  private readonly api = inject(AdminCatalogApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input.required<boolean>();
  readonly ingredient = input<AdminIngredient | null>(null);
  readonly ingredientTypes = input.required<AdminIngredientType[]>();

  readonly visibleChange = output<boolean>();
  readonly saved = output<AdminIngredient>();
  readonly savingChange = output<boolean>();
  readonly saving = signal(false);

  private initializedFor: string | null = null;

  readonly form = this.fb.nonNullable.group({
    ingredient_type_id: [0, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
  });

  constructor() {
    effect(() => {
      const visible = this.visible();
      const ingredient = this.ingredient();
      const types = this.ingredientTypes();

      if (!visible) { this.initializedFor = null; return; }

      const key = ingredient ? `edit:${ingredient.id}` : 'new';
      if (this.initializedFor === key) return;
      this.initializedFor = key;

      this.form.reset({
        ingredient_type_id: ingredient?.ingredient_type_id ?? types[0]?.id ?? 0,
        name: ingredient?.name ?? '',
      });
    });
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) this.close();
  }

  close(): void {
    if (this.saving()) return;
    this.initializedFor = null;
    this.visibleChange.emit(false);
  }

  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    const raw = this.form.getRawValue();
    const payload: AdminIngredientPayload = {
      ingredient_type_id: Number(raw.ingredient_type_id),
      name: raw.name.trim(),
    };
    const editing = this.ingredient();
    const request = editing ? this.api.updateIngredient(editing.id, payload) : this.api.createIngredient(payload);

    this.setSaving(true);
    request.pipe(finalize(() => this.setSaving(false)), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.saved.emit(response.data);
        this.initializedFor = null;
        this.visibleChange.emit(false);
        this.messages.add({ severity:'success', summary: editing ? 'Ingrediente actualizado' : 'Ingrediente creado', detail: response.message, life:3000 });
      },
      error: (error: HttpErrorResponse) => this.messages.add({ severity:'error', summary:'No se guardó el ingrediente', detail:this.errorMessage(error), life:4500 }),
    });
  }

  private setSaving(value: boolean): void { this.saving.set(value); this.savingChange.emit(value); }
  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as AdminValidationErrorResponse | string | null;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') return Object.values(body.errors ?? {}).flat().find(Boolean) ?? body.message ?? 'Ocurrió un problema procesando la solicitud.';
    return error.message || 'Ocurrió un problema procesando la solicitud.';
  }
}
