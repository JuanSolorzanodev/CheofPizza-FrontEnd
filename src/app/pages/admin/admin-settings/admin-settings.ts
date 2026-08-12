import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { AdminSettingsApiService } from '../../../core/api/admin/settings/admin-settings-api.service';
import {
  AdminBusinessSettings,
  AdminBusinessSettingsPayload,
  AdminSettingsValidationErrorResponse,
} from '../../../core/api/admin/settings/admin-settings.models';
import { AdminSettingsFormComponent } from '../../../shared/components/admin-settings-form/admin-settings-form';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [ButtonModule, SkeletonModule, AdminSettingsFormComponent],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettings {
  private readonly api = inject(AdminSettingsApiService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly settingsForm = viewChild(AdminSettingsFormComponent);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly settings = signal<AdminBusinessSettings | null>(null);
  readonly serverErrors = signal<Record<string, string[]>>({});

  constructor() {
    this.loadSettings();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnload(event: BeforeUnloadEvent): void {
    if (!this.dirty() || this.saving()) {
      return;
    }

    event.preventDefault();
  }

  refresh(): void {
    if (this.saving()) {
      return;
    }

    this.loadSettings(true);
  }

  save(): void {
    this.settingsForm()?.submit();
  }

  onDirtyChange(dirty: boolean): void {
    this.dirty.set(dirty);
  }

  saveSettings(payload: AdminBusinessSettingsPayload): void {
    if (this.saving()) {
      return;
    }

    this.serverErrors.set({});
    this.saving.set(true);

    this.api
      .updateSettings(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.settings.set(response.data);
          this.serverErrors.set({});
          this.messageService.add({
            severity: 'success',
            summary: 'Configuración guardada',
            detail: response.message,
          });
        },
        error: (error: HttpErrorResponse) => this.handleSaveError(error),
      });
  }

  private loadSettings(refreshing = false): void {
    if (refreshing) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.api
      .getSettings()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.settings.set(response.data);
          this.serverErrors.set({});
        },
        error: (error: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo cargar la configuración',
            detail: this.errorMessage(error),
          });
        },
      });
  }

  private handleSaveError(error: HttpErrorResponse): void {
    const body = error.error as AdminSettingsValidationErrorResponse | null;

    if (error.status === 422 && body?.errors) {
      this.serverErrors.set(body.errors);
      this.messageService.add({
        severity: 'warn',
        summary: 'No se pudo guardar',
        detail: body.message ?? 'Revisa los campos marcados.',
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'No se pudo guardar',
      detail: this.errorMessage(error),
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as AdminSettingsValidationErrorResponse | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }

    return 'Ocurrió un error inesperado. Inténtalo nuevamente.';
  }
}
