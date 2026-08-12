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
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminIngredient,
  AdminSize,
  AdminUpdateIngredientPricesPayload,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';

export interface AdminIngredientPricesSavedEvent {
  ingredientId: number;
  prices: AdminIngredient['prices'];
}

@Component({
  selector: 'app-admin-ingredient-prices-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputNumberModule],
  templateUrl: './admin-ingredient-prices-dialog.html',
  styleUrl: './admin-ingredient-prices-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredientPricesDialogComponent {
  private readonly api = inject(AdminCatalogApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly visible = input.required<boolean>();
  readonly ingredient = input<AdminIngredient | null>(null);
  readonly sizes = input.required<AdminSize[]>();
  readonly visibleChange = output<boolean>();
  readonly saved = output<AdminIngredientPricesSavedEvent>();
  readonly savingChange = output<boolean>();
  readonly saving = signal(false);
  private initializedFor: number | null = null;
  readonly form = this.fb.nonNullable.group({ prices: this.fb.array([]) });
  get priceRows(): FormArray {
    return this.form.controls.prices;
  }
  constructor() {
    effect(() => {
      const visible = this.visible();
      const ingredient = this.ingredient();
      const sizes = this.sizes();
      if (!visible || !ingredient) {
        this.initializedFor = null;
        return;
      }
      if (this.initializedFor === ingredient.id) return;
      this.initializedFor = ingredient.id;
      this.priceRows.clear();
      for (const size of sizes) {
        const existing = ingredient.prices.find((p) => p.size_id === size.id);
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
    });
  }
  onVisibleChange(v: boolean): void {
    if (!v) this.close();
  }
  close(): void {
    if (this.saving()) return;
    this.initializedFor = null;
    this.priceRows.clear();
    this.visibleChange.emit(false);
  }
  save(): void {
    this.form.markAllAsTouched();
    const ingredient = this.ingredient();
    if (!ingredient || this.form.invalid || this.saving()) return;
    const payload: AdminUpdateIngredientPricesPayload = {
      prices: this.priceRows.controls.map((c) => {
        const v = c.getRawValue();
        return { size_id: Number(v.size_id), extra_price: Number(v.extra_price) };
      }),
    };
    this.setSaving(true);
    this.api
      .updateIngredientPrices(ingredient.id, payload)
      .pipe(
        finalize(() => this.setSaving(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.saved.emit({ ingredientId: ingredient.id, prices: r.data });
          this.initializedFor = null;
          this.priceRows.clear();
          this.visibleChange.emit(false);
          this.messages.add({
            severity: 'success',
            summary: 'Precios actualizados',
            detail: r.message,
            life: 3000,
          });
        },
        error: (e: HttpErrorResponse) =>
          this.messages.add({
            severity: 'error',
            summary: 'No se guardaron los precios',
            detail: this.errorMessage(e),
            life: 4500,
          }),
      });
  }
  private setSaving(v: boolean): void {
    this.saving.set(v);
    this.savingChange.emit(v);
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
