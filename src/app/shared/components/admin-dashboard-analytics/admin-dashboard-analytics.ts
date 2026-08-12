import {
  CurrencyPipe,
  DecimalPipe,
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  RouterLink,
} from '@angular/router';
import {
  ChartData,
  ChartOptions,
} from 'chart.js';
import {
  ChartModule,
} from 'primeng/chart';
import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  AdminDashboardAnalyticsBundle,
  AdminPaymentMethodAnalytics,
} from '../../../core/api/admin/analytics/admin-sales-analytics.models';

@Component({
  selector: 'app-admin-dashboard-analytics',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    RouterLink,
    ChartModule,
    SkeletonModule,
  ],
  templateUrl: './admin-dashboard-analytics.html',
  styleUrl: './admin-dashboard-analytics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardAnalyticsComponent {
  readonly loading = input(false);

  readonly data = input<AdminDashboardAnalyticsBundle | null>(null);

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
      this.data()?.hourly.summary.peak_sales_hour_label
      ?? 'Sin actividad',
  );

  readonly peakSalesAmount = computed(
    () => this.data()?.hourly.summary.peak_sales_amount ?? 0,
  );

  readonly peakOrdersHour = computed(
    () =>
      this.data()?.hourly.summary.peak_orders_hour_label
      ?? 'Sin actividad',
  );

  readonly peakOrdersCount = computed(
    () => this.data()?.hourly.summary.peak_orders_count ?? 0,
  );

  readonly topPizza = computed(
    () => this.data()?.products.summary.top_pizza ?? null,
  );

  readonly topPromotion = computed(
    () => this.data()?.products.summary.top_promotion ?? null,
  );

  readonly dailySalesChartData = computed<ChartData<'line'>>(() => {
    const days = this.data()?.daily.days ?? [];

    return {
      labels: days.map(item => this.chartDateLabel(item.date)),
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

  readonly hourlySalesChartData = computed<ChartData<'bar'>>(() => {
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

  readonly paymentChartData = computed<ChartData<'doughnut'>>(() => {
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

  readonly productsChartData = computed<ChartData<'bar'>>(() => {
    const pizzas = (this.data()?.products.pizzas ?? []).slice(0, 6);

    return {
      labels: pizzas.map(pizza => pizza.pizza_name),
      datasets: [
        {
          label: 'Unidades equivalentes',
          data: pizzas.map(pizza => pizza.equivalent_units),
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
          title: items => items[0]?.label ?? '',
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
          callback: value => this.compactMoney(Number(value)),
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
          label: context => `Ventas: ${this.money(context.parsed.y)}`,
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
          callback: value => this.compactMoney(Number(value)),
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

  paymentMethodCount(method: AdminPaymentMethodAnalytics): number {
    return method.orders ?? method.payments ?? 0;
  }

  paymentMethodPercentage(method: AdminPaymentMethodAnalytics): number {
    const total = this.data()?.payments.summary.collected_total ?? 0;

    if (total <= 0) {
      return 0;
    }

    return (method.amount / total) * 100;
  }

  private money(value: number | string | null): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  private compactMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private chartDateLabel(value: string): string {
    const date = new Date(`${value}T00:00:00`);

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}
