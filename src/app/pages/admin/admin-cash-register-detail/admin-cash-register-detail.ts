import {
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';

import {
  finalize,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';

import {
  ButtonModule,
} from 'primeng/button';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  TableModule,
} from 'primeng/table';

import {
  TagModule,
} from 'primeng/tag';

import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  AdminCashRegisterApiService,
} from '../../../core/api/admin/cash-register/admin-cash-register-api.service';

import {
  ApiValidationErrorResponse,
  CashMovementType,
  CashSessionDetail,
  CashSessionStatus,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

@Component({
  selector:
    'app-admin-cash-register-detail',

  standalone:
    true,

  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],

  templateUrl:
    './admin-cash-register-detail.html',

  styleUrl:
    './admin-cash-register-detail.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterDetail {
  private readonly api =
    inject(
      AdminCashRegisterApiService,
    );

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly messages =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly detail =
    signal<CashSessionDetail | null>(
      null,
    );

  readonly sessionUuid =
    signal('');

  readonly isOpen =
    computed(
      () =>
        this.detail()
          ?.session.status
        === 'open',
    );

  readonly difference =
    computed(
      () =>
        this.detail()
          ?.summary.amounts.difference
        ?? null,
    );

  readonly hasDifference =
    computed(
      () =>
        this.difference() !== null
        && this.difference() !== 0,
    );

  constructor() {
    const uuid =
      this.route.snapshot.paramMap.get(
        'uuid',
      );

    if (
      uuid === null
      || uuid.trim().length === 0
    ) {
      void this.router.navigateByUrl(
        '/admin/cash-register/history',
      );

      return;
    }

    this.sessionUuid.set(uuid);
    this.load();
  }

  load(
    refreshing = false,
  ): void {
    const uuid =
      this.sessionUuid();

    if (!uuid) {
      return;
    }

    if (refreshing) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.api
      .getDetail(uuid)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: response => {
          this.detail.set(
            response.data,
          );
        },

        error: error => {
          const payload =
            error.error as
              | ApiValidationErrorResponse
              | undefined;

          this.messages.add({
            severity:
              'error',

            summary:
              'No se pudo cargar la caja',

            detail:
              payload?.message
              || 'Ocurrió un error consultando el detalle de la caja.',
          });

          if (
            error.status === 404
          ) {
            void this.router.navigateByUrl(
              '/admin/cash-register/history',
            );
          }
        },
      });
  }

  refresh(): void {
    this.load(true);
  }

  statusLabel(
    status: CashSessionStatus,
  ): string {
    return status === 'open'
      ? 'Caja abierta'
      : 'Caja cerrada';
  }

  statusSeverity(
    status: CashSessionStatus,
  ): TagSeverity {
    return status === 'open'
      ? 'success'
      : 'secondary';
  }

  movementLabel(
    type: CashMovementType,
  ): string {
    return type === 'income'
      ? 'Ingreso'
      : 'Egreso';
  }

  movementSeverity(
    type: CashMovementType,
  ): TagSeverity {
    return type === 'income'
      ? 'success'
      : 'danger';
  }

  movementSign(
    type: CashMovementType,
  ): string {
    return type === 'income'
      ? '+'
      : '-';
  }

  differenceClass(
    difference: number | null,
  ): string {
    if (
      difference === null
      || difference === 0
    ) {
      return 'cash-detail-difference--neutral';
    }

    return difference > 0
      ? 'cash-detail-difference--positive'
      : 'cash-detail-difference--negative';
  }

  differenceLabel(
    difference: number | null,
  ): string {
    if (difference === null) {
      return 'Sin arqueo';
    }

    if (difference === 0) {
      return 'Caja exacta';
    }

    return difference > 0
      ? 'Sobrante'
      : 'Faltante';
  }
}
