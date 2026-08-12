import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TooltipModule } from 'primeng/tooltip';

import { AdminSalesAnalyticsApiService } from '../../../core/api/admin/analytics/admin-sales-analytics-api.service';
import {
  AdminApiValidationError,
  AdminDashboardAnalyticsBundle,
} from '../../../core/api/admin/analytics/admin-sales-analytics.models';
import { AdminDashboardAnalyticsComponent } from '../../../shared/components/admin-dashboard-analytics/admin-dashboard-analytics';
import { AdminDashboardOverviewComponent } from '../../../shared/components/admin-dashboard-overview/admin-dashboard-overview';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    DatePickerModule,
    TooltipModule,
    AdminDashboardAnalyticsComponent,
    AdminDashboardOverviewComponent,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private readonly api = inject(AdminSalesAnalyticsApiService);

  private readonly messages = inject(MessageService);

  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly data = signal<AdminDashboardAnalyticsBundle | null>(null);

  readonly dateFrom = signal<Date | null>(this.startOfCurrentMonth());

  readonly dateTo = signal<Date | null>(new Date());

  readonly summary = computed(() => this.data()?.dashboard.summary ?? null);

  readonly comparison = computed(() => this.data()?.dashboard.comparison ?? null);

  readonly periodLabel = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();

    if (!from || !to) {
      return 'Periodo personalizado';
    }

    return `${this.shortDate(from)} – ${this.shortDate(to)}`;
  });

  readonly periodDays = computed(() => this.data()?.dashboard.period.days ?? 0);

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.hasValidDateRange()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Rango inválido',
        detail: 'La fecha inicial no puede ser posterior a la fecha final.',
      });
      return;
    }

    this.loading.set(true);

    this.api
      .getDashboardBundle({
        date_from: this.formatDate(this.dateFrom()),
        date_to: this.formatDate(this.dateTo()),
        timezone: 'America/Guayaquil',
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (bundle) => this.data.set(bundle),
        error: (error) => {
          const payload = error.error as AdminApiValidationError | undefined;

          this.messages.add({
            severity: 'error',
            summary: 'No se pudo cargar el dashboard',
            detail:
              payload?.message || 'Ocurrió un error consultando las estadísticas administrativas.',
          });
        },
      });
  }

  applyPeriod(): void {
    this.load();
  }

  resetPeriod(): void {
    this.dateFrom.set(this.startOfCurrentMonth());
    this.dateTo.set(new Date());
    this.load();
  }

  private hasValidDateRange(): boolean {
    const from = this.dateFrom();
    const to = this.dateTo();

    return !from || !to || from <= to;
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private shortDate(value: Date): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private formatDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
