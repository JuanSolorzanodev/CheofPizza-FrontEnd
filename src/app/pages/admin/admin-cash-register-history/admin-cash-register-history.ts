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
  FormsModule,
} from '@angular/forms';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
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
  DatePickerModule,
} from 'primeng/datepicker';

import {
  PaginatorModule,
  PaginatorState,
} from 'primeng/paginator';

import {
  SelectModule,
} from 'primeng/select';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  AdminCashRegisterApiService,
} from '../../../core/api/admin/cash-register/admin-cash-register-api.service';

import {
  ApiValidationErrorResponse,
  CashSession,
  CashSessionStatus,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

import {
  AdminCashRegisterHistoryTableComponent,
} from '../../../shared/components/admin-cash-register-history-table/admin-cash-register-history-table';

interface StatusOption {
  label: string;
  value: CashSessionStatus | null;
}

@Component({
  selector:
    'app-admin-cash-register-history',

  standalone:
    true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    AdminCashRegisterHistoryTableComponent,
  ],

  templateUrl:
    './admin-cash-register-history.html',

  styleUrl:
    './admin-cash-register-history.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterHistory {
  private readonly api =
    inject(
      AdminCashRegisterApiService,
    );

  private readonly messages =
    inject(MessageService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly sessions =
    signal<CashSession[]>([]);

  readonly total =
    signal(0);

  readonly page =
    signal(1);

  readonly perPage =
    signal(15);

  readonly dateFrom =
    signal<Date | null>(null);

  readonly dateTo =
    signal<Date | null>(null);

  readonly status =
    signal<CashSessionStatus | null>(
      null,
    );

  readonly statusOptions:
    StatusOption[] = [
      {
        label:
          'Todos los estados',

        value:
          null,
      },
      {
        label:
          'Caja abierta',

        value:
          'open',
      },
      {
        label:
          'Caja cerrada',

        value:
          'closed',
      },
    ];

  readonly first =
    computed(
      () =>
        (
          this.page() - 1
        ) * this.perPage(),
    );

  readonly visibleFrom =
    computed(() => {
      if (this.total() === 0) {
        return 0;
      }

      return (
        this.first() + 1
      );
    });

  readonly visibleTo =
    computed(() =>
      Math.min(
        this.page()
          * this.perPage(),

        this.total(),
      ),
    );

  readonly hasFilters =
    computed(
      () =>
        this.dateFrom() !== null
        || this.dateTo() !== null
        || this.status() !== null,
    );

  constructor() {
    this.load();
  }

  load(
    refreshing = false,
  ): void {
    if (refreshing) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }

    this.api
      .getHistory({
        date_from:
          this.formatDate(
            this.dateFrom(),
          ),

        date_to:
          this.formatDate(
            this.dateTo(),
          ),

        status:
          this.status(),

        page:
          this.page(),

        per_page:
          this.perPage(),
      })
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
          this.sessions.set(
            response.data,
          );

          this.total.set(
            response.meta.total,
          );

          this.page.set(
            response.meta.current_page,
          );

          this.perPage.set(
            response.meta.per_page,
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
              'No se pudo cargar el historial',

            detail:
              payload?.message
              || 'Ocurrió un error consultando las cajas.',
          });
        },
      });
  }

  applyFilters(): void {
    if (
      this.dateFrom()
      && this.dateTo()
      && this.dateFrom()!
        > this.dateTo()!
    ) {
      this.messages.add({
        severity:
          'warn',

        summary:
          'Fechas inválidas',

        detail:
          'La fecha inicial no puede ser posterior a la fecha final.',
      });

      return;
    }

    this.page.set(1);
    this.load();
  }

  clearFilters(): void {
    this.dateFrom.set(null);
    this.dateTo.set(null);
    this.status.set(null);
    this.page.set(1);

    this.load();
  }

  refresh(): void {
    this.load(true);
  }

  onPageChange(
    event: PaginatorState,
  ): void {
    const rows =
      event.rows
      ?? this.perPage();

    const first =
      event.first
      ?? 0;

    this.perPage.set(rows);

    this.page.set(
      Math.floor(
        first / rows,
      ) + 1,
    );

    this.load();
  }

  private formatDate(
    value: Date | null,
  ): string | null {
    if (value === null) {
      return null;
    }

    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1,
      ).padStart(
        2,
        '0',
      );

    const day =
      String(
        value.getDate(),
      ).padStart(
        2,
        '0',
      );

    return `${year}-${month}-${day}`;
  }
}
