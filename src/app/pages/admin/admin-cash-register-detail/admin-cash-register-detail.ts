import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { AdminCashRegisterApiService } from '../../../core/api/admin/cash-register/admin-cash-register-api.service';
import {
  ApiValidationErrorResponse,
  CashSessionDetail,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';
import { AdminCashRegisterDetailViewComponent } from '../../../shared/components/admin-cash-register-detail-view/admin-cash-register-detail-view';

@Component({
  selector: 'app-admin-cash-register-detail',
  standalone: true,
  imports: [RouterLink, ButtonModule, SkeletonModule, AdminCashRegisterDetailViewComponent],
  templateUrl: './admin-cash-register-detail.html',
  styleUrl: './admin-cash-register-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterDetail {
  private readonly api = inject(AdminCashRegisterApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly detail = signal<CashSessionDetail | null>(null);
  readonly sessionUuid = signal('');

  constructor() {
    const uuid = this.route.snapshot.paramMap.get('uuid');

    if (uuid === null || uuid.trim().length === 0) {
      void this.router.navigateByUrl('/admin/cash-register/history');
      return;
    }

    this.sessionUuid.set(uuid);
    this.load();
  }

  load(refreshing = false): void {
    const uuid = this.sessionUuid();
    if (!uuid) return;

    if (refreshing) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.api
      .getDetail(uuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (response) => this.detail.set(response.data),
        error: (error) => {
          const payload = error.error as ApiValidationErrorResponse | undefined;
          this.messages.add({
            severity: 'error',
            summary: 'No se pudo cargar la caja',
            detail: payload?.message || 'Ocurrió un error consultando el detalle de la caja.',
          });

          if (error.status === 404) {
            void this.router.navigateByUrl('/admin/cash-register/history');
          }
        },
      });
  }

  refresh(): void {
    this.load(true);
  }
}
