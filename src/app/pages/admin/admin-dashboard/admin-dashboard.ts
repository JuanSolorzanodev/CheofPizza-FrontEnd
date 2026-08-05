import {
  CurrencyPipe,
  DecimalPipe,
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
  FormsModule,
} from '@angular/forms';
import {
  RouterLink,
} from '@angular/router';
import {
  ChartData,
  ChartOptions,
} from 'chart.js';
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
  ChartModule,
} from 'primeng/chart';
import {
  DatePickerModule,
} from 'primeng/datepicker';
import {
  SkeletonModule,
} from 'primeng/skeleton';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  AdminSalesAnalyticsApiService,
} from '../../../core/api/admin/analytics/admin-sales-analytics-api.service';
import {
  AdminApiValidationError,
  AdminDashboardAnalyticsBundle,
  AdminPaymentMethodAnalytics,
  AdminSalesComparison,
  AdminSalesSummary,
} from '../../../core/api/admin/analytics/admin-sales-analytics.models';

type ComparisonTone =
  | 'positive'
  | 'negative'
  | 'neutral';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    SkeletonModule,
    TooltipModule,
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboard {
  private readonly api = inject(
    AdminSalesAnalyticsApiService,
  );

  private readonly messages = inject(
    MessageService,
  );

  private readonly destroyRef = inject(
    DestroyRef,
  );

  readonly loading = signal(true);

  readonly data = signal<
    AdminDashboardAnalyticsBundle | null
  >(null);

  readonly dateFrom = signal<Date | null>(
    this.startOfCurrentMonth(),
  );

  readonly dateTo = signal<Date | null>(
    new Date(),
  );

  readonly summary = computed<
    AdminSalesSummary | null
  >(() => this.data()?.dashboard.summary ?? null);

  readonly comparison = computed<
    AdminSalesComparison | null
  >(() => this.data()?.dashboard.comparison ?? null);

  readonly periodLabel = computed(() => {
    const from = this.dateFrom();
    const to = this.dateTo();

    if (!from || !to) {
      return 'Periodo personalizado';
    }

    return `${this.shortDate(from)} – ${this.shortDate(to)}`;
  });

  readonly periodDays = computed(
    () => this.data()?.dashboard.period.days ?? 0,
  );

  readonly dailyAverageSales = computed(() => {
    const days = this.data()?.daily.days ?? [];

    if (days.length === 0) {
      return 0;
    }

    const total = days.reduce(
      (sum, day) => sum + Number(day.net_sales ?? 0),
      0,
    );

    return total / days.length;
  });

  readonly bestSalesDay = computed(() => {
    const days = this.data()?.daily.days ?? [];

    if (days.length === 0) {
      return null;
    }

    return days.reduce((best, current) =>
      current.net_sales > best.net_sales
        ? current
        : best,
    );
  });

  readonly peakSalesHour = computed(
    () =>
      this.data()?.hourly.summary
        .peak_sales_hour_label ?? 'Sin actividad',
  );

  readonly peakSalesAmount = computed(
    () =>
      this.data()?.hourly.summary
        .peak_sales_amount ?? 0,
  );

  readonly peakOrdersHour = computed(
    () =>
      this.data()?.hourly.summary
        .peak_orders_hour_label ?? 'Sin actividad',
  );

  readonly peakOrdersCount = computed(
    () =>
      this.data()?.hourly.summary
        .peak_orders_count ?? 0,
  );

  readonly topPizza = computed(
    () =>
      this.data()?.products.summary.top_pizza
      ?? null,
  );

  readonly topPromotion = computed(
    () =>
      this.data()?.products.summary.top_promotion
      ?? null,
  );

  readonly hasFinancialAlerts = computed(() => {
    const payments = this.data()?.payments;

    if (!payments) {
      return false;
    }

    return (
      payments.pending.transactions > 0
      || payments.refunds.refunded_payments > 0
      || payments.refunds
        .partially_refunded_payments > 0
    );
  });

  /**
   * El gráfico principal muestra únicamente dinero.
   * Evitamos mezclar dólares y número de pedidos en la misma curva,
   * porque son unidades distintas y la lectura puede resultar engañosa.
   */
  readonly dailySalesChartData = computed<
    ChartData<'line'>
  >(() => {
    const days = this.data()?.daily.days ?? [];

    return {
      labels: days.map(item =>
        this.chartDateLabel(item.date),
      ),
      datasets: [
        {
          label: 'Ventas netas',
          data: days.map(item => item.net_sales),
          borderColor: '#159447',
          backgroundColor: 'rgba(21, 148, 71, 0.12)',
          pointBackgroundColor: '#159447',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: days.length > 14 ? 1.5 : 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          fill: true,
          tension: 0.28,
        },
      ],
    };
  });

  readonly hourlySalesChartData = computed<
    ChartData<'bar'>
  >(() => {
    const hours = this.data()?.hourly.hours ?? [];

    return {
      labels: hours.map(item => item.label),
      datasets: [
        {
          label: 'Ventas netas',
          data: hours.map(item => item.net_sales),
          backgroundColor: 'rgba(21, 148, 71, 0.72)',
          borderColor: '#159447',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 24,
        },
      ],
    };
  });

  readonly paymentChartData = computed<
    ChartData<'doughnut'>
  >(() => {
    const methods = this.data()?.payments.methods ?? [];

    return {
      labels: methods.map(method => method.label),
      datasets: [
        {
          data: methods.map(method => method.amount),
          backgroundColor: [
            '#16a34a',
            '#2563eb',
            '#6366f1',
          ],
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 4,
          spacing: 1,
        },
      ],
    };
  });

  readonly productsChartData = computed<
    ChartData<'bar'>
  >(() => {
    const pizzas = (
      this.data()?.products.pizzas ?? []
    ).slice(0, 6);

    return {
      labels: pizzas.map(pizza => pizza.pizza_name),
      datasets: [
        {
          label: 'Unidades equivalentes',
          data: pizzas.map(
            pizza => pizza.equivalent_units,
          ),
          backgroundColor: 'rgba(21, 148, 71, 0.74)',
          borderColor: '#159447',
          borderWidth: 1,
          borderRadius: 6,
          maxBarThickness: 30,
        },
      ],
    };
  });

  readonly dailyChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    layout: {
      padding: {
        top: 6,
        right: 8,
        bottom: 0,
        left: 2,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        padding: 10,
        callbacks: {
          title: items =>
            items[0]?.label ?? '',
          label: context =>
            `Ventas netas: ${this.money(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        offset: false,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 9,
          padding: 8,
        },
      },
      y: {
        beginAtZero: true,
        grace: '8%',
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.16)',
        },
        ticks: {
          padding: 8,
          callback: value =>
            this.compactMoney(Number(value)),
        },
      },
    },
  };

  readonly hourlyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: context =>
            `Ventas: ${this.money(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 12,
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.16)',
        },
        ticks: {
          callback: value =>
            this.compactMoney(Number(value)),
        },
      },
    },
  };

  readonly paymentChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    cutout: '72%',
    radius: '92%',
    layout: {
      padding: 6,
    },
    plugins: {
      // La leyenda nativa se desactiva porque ya existe una lista
      // accesible y detallada debajo del gráfico.
      legend: {
        display: false,
      },
      tooltip: {
        padding: 10,
        callbacks: {
          label: context =>
            `${context.label}: ${this.money(context.parsed)}`,
        },
      },
    },
  };

  readonly productsChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: context =>
            `${context.parsed.x} unidades equivalentes`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        border: {
          display: false,
        },
        grid: {
          color: 'rgba(148, 163, 184, 0.16)',
        },
        ticks: {
          precision: 1,
        },
      },
      y: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
      },
    },
  };

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.hasValidDateRange()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Rango inválido',
        detail:
          'La fecha inicial no puede ser posterior a la fecha final.',
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
        next: bundle => this.data.set(bundle),
        error: error => {
          const payload = error.error as
            | AdminApiValidationError
            | undefined;

          this.messages.add({
            severity: 'error',
            summary: 'No se pudo cargar el dashboard',
            detail:
              payload?.message
              || 'Ocurrió un error consultando las estadísticas administrativas.',
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

  comparisonLabel(value: number | null): string {
    if (value === null) {
      return 'Sin referencia';
    }

    if (value === 0) {
      return 'Sin variación';
    }

    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  comparisonTone(
    value: number | null,
  ): ComparisonTone {
    if (value === null || value === 0) {
      return 'neutral';
    }

    return value > 0 ? 'positive' : 'negative';
  }

  comparisonIcon(value: number | null): string {
    if (value === null || value === 0) {
      return 'pi pi-minus';
    }

    return value > 0
      ? 'pi pi-arrow-up-right'
      : 'pi pi-arrow-down-right';
  }

  paymentMethodCount(
    method: AdminPaymentMethodAnalytics,
  ): number {
    return method.orders ?? method.payments ?? 0;
  }

  paymentMethodPercentage(
    method: AdminPaymentMethodAnalytics,
  ): number {
    const total =
      this.data()?.payments.summary.collected_total
      ?? 0;

    if (total <= 0) {
      return 0;
    }

    return (method.amount / total) * 100;
  }

  money(value: number | string | null): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  compactMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private hasValidDateRange(): boolean {
    const from = this.dateFrom();
    const to = this.dateTo();

    return !from || !to || from <= to;
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
  }

  private shortDate(value: Date): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private chartDateLabel(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }

  private formatDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1)
      .padStart(2, '0');
    const day = String(value.getDate())
      .padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
