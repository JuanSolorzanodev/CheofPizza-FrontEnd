import {
  HttpErrorResponse,
} from '@angular/common/http';

import {
  DestroyRef,
  Injectable,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';

import {
  ApiValidationErrorResponse,
  CashMovement,
  CashSession,
  CashSessionSummary,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  StoreCashMovementPayload,
} from './admin-cash-register.models';

import {
  AdminCashRegisterApiService,
} from './admin-cash-register-api.service';

@Injectable()
export class AdminCashRegisterStore {
  private readonly api =
    inject(AdminCashRegisterApiService);

  private readonly toast =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly actionLoading =
    signal(false);

  readonly session =
    signal<CashSession | null>(null);

  readonly summary =
    signal<CashSessionSummary | null>(null);

  readonly movements =
    signal<CashMovement[]>([]);

  readonly serverErrors =
    signal<Record<string, string[]>>({});

  load(
    refreshing = false,
  ): void {
    if (refreshing) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.api
      .getCurrent()
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
          this.session.set(
            response.data,
          );

          if (response.data === null) {
            this.summary.set(null);
            this.movements.set([]);

            return;
          }

          this.loadSessionData(
            response.data.uuid,
          );
        },

        error: error =>
          this.handleError(
            error,
            'No se pudo consultar la caja actual.',
          ),
      });
  }

  open(
    payload: OpenCashSessionPayload,
    done: () => void,
  ): void {
    this.actionLoading.set(true);
    this.serverErrors.set({});

    this.api
      .open(payload)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() =>
          this.actionLoading.set(false),
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary: 'Caja abierta',
            detail: response.message,
          });

          done();
          this.load();
        },

        error: error =>
          this.handleError(
            error,
            'No se pudo abrir la caja.',
          ),
      });
  }

  addMovement(
    payload: StoreCashMovementPayload,
    done: () => void,
  ): void {
    const current =
      this.session();

    if (current === null) {
      return;
    }

    this.actionLoading.set(true);
    this.serverErrors.set({});

    this.api
      .storeMovement(
        current.uuid,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() =>
          this.actionLoading.set(false),
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary:
              'Movimiento registrado',
            detail:
              response.message,
          });

          done();

          this.loadSessionData(
            current.uuid,
          );
        },

        error: error =>
          this.handleError(
            error,
            'No se pudo registrar el movimiento.',
          ),
      });
  }

  close(
    payload: CloseCashSessionPayload,
    done: () => void,
  ): void {
    const current =
      this.session();

    if (current === null) {
      return;
    }

    this.actionLoading.set(true);
    this.serverErrors.set({});

    this.api
      .close(
        current.uuid,
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
        finalize(() =>
          this.actionLoading.set(false),
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary: 'Caja cerrada',
            detail: response.message,
          });

          done();
          this.load();
        },

        error: error =>
          this.handleError(
            error,
            'No se pudo cerrar la caja.',
          ),
      });
  }

  clearErrors(): void {
    this.serverErrors.set({});
  }

  private loadSessionData(
    uuid: string,
  ): void {
    forkJoin({
      summary:
        this.api.getSummary(uuid),

      movements:
        this.api.getMovements(
          uuid,
          10,
        ),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.summary.set(
            response.summary.data,
          );

          this.movements.set(
            response.movements.data,
          );
        },

        error: error =>
          this.handleError(
            error,
            'No se pudo cargar el resumen de caja.',
          ),
      });
  }

  private handleError(
    error: HttpErrorResponse,
    fallback: string,
  ): void {
    const payload =
      error.error as
        | ApiValidationErrorResponse
        | undefined;

    this.serverErrors.set(
      payload?.errors ?? {},
    );

    this.toast.add({
      severity: 'error',
      summary:
        'Operación no completada',
      detail:
        payload?.message || fallback,
    });
  }
}
