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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminIngredientType,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-ingredient-type-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule],
  templateUrl: './admin-ingredient-type-dialog.html',
  styleUrl: './admin-ingredient-type-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredientTypeDialogComponent {
  private readonly api = inject(AdminCatalogApiService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  readonly visible = input.required<boolean>();
  readonly type = input<AdminIngredientType | null>(null);
  readonly visibleChange = output<boolean>();
  readonly saved = output<AdminIngredientType>();
  readonly savingChange = output<boolean>();
  readonly saving = signal(false);
  private initializedFor: string | null = null;
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
  });
  constructor() {
    effect(() => {
      const visible = this.visible();
      const type = this.type();
      if (!visible) {
        this.initializedFor = null;
        return;
      }
      const key = type ? `edit:${type.id}` : 'new';
      if (this.initializedFor === key) return;
      this.initializedFor = key;
      this.form.reset({ name: type?.name ?? '' });
    });
  }
  onVisibleChange(v: boolean): void {
    if (!v) this.close();
  }
  close(): void {
    if (this.saving()) return;
    this.initializedFor = null;
    this.visibleChange.emit(false);
  }
  save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const editing = this.type();
    const payload = { name: this.form.controls.name.value.trim() };
    const request = editing
      ? this.api.updateIngredientType(editing.id, payload)
      : this.api.createIngredientType(payload);
    this.setSaving(true);
    request
      .pipe(
        finalize(() => this.setSaving(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (r) => {
          this.saved.emit(r.data);
          this.initializedFor = null;
          this.visibleChange.emit(false);
          this.messages.add({
            severity: 'success',
            summary: editing ? 'Tipo actualizado' : 'Tipo creado',
            detail: r.message,
            life: 3000,
          });
        },
        error: (e: HttpErrorResponse) =>
          this.messages.add({
            severity: 'error',
            summary: 'No se guardó el tipo',
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
