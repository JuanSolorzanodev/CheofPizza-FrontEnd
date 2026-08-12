import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';

import { MachineLearningComparison } from '../../../core/api/machine-learning/machine-learning.models';
import { ThemeService } from '../../../core/state/theme.service';
import {
  mlFormatDate,
  mlFormatNumber,
  mlFormatPercentage,
  mlFormatShortDate,
  mlFormatSignedNumber,
} from '../../ui/ml-comparison-ui.utils';

@Component({
  selector: 'app-ml-comparison-chart',
  standalone: true,
  imports: [ChartModule],
  templateUrl: './ml-comparison-chart.html',
  styleUrl: './ml-comparison-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MlComparisonChartComponent {
  readonly comparison = input.required<MachineLearningComparison>();

  private readonly theme = inject(ThemeService);

  readonly hasResults = computed(() => this.comparison().days.length > 0);

  readonly formatDate = mlFormatDate;
  readonly formatNumber = mlFormatNumber;
  readonly formatPercentage = mlFormatPercentage;
  readonly formatShortDate = mlFormatShortDate;
  readonly formatSignedNumber = mlFormatSignedNumber;
  readonly chartData = computed<ChartData<'line'>>(() => {
    const darkMode = this.theme.mode() === 'dark';

    const predictedColor = darkMode ? '#facc15' : '#ca8a04';

    const actualColor = darkMode ? '#4ade80' : '#16a34a';

    const predictedBackground = darkMode ? 'rgba(250, 204, 21, 0.12)' : 'rgba(202, 138, 4, 0.10)';

    const actualBackground = darkMode ? 'rgba(74, 222, 128, 0.12)' : 'rgba(22, 163, 74, 0.10)';

    const days = this.comparison()?.days ?? [];

    return {
      labels: days.map((day) => this.formatShortDate(day.date)),

      datasets: [
        {
          label: 'Predicción',

          data: days.map((day) => day.predicted_total),

          borderColor: predictedColor,

          backgroundColor: predictedBackground,

          pointBackgroundColor: predictedColor,

          pointBorderColor: darkMode ? '#111827' : '#ffffff',

          borderWidth: 3,

          pointRadius: 4,

          pointHoverRadius: 7,

          pointBorderWidth: 2,

          tension: 0.32,

          fill: false,
        },

        {
          label: 'Ventas reales',

          data: days.map((day) => day.actual_total),

          borderColor: actualColor,

          backgroundColor: actualBackground,

          pointBackgroundColor: actualColor,

          pointBorderColor: darkMode ? '#111827' : '#ffffff',

          borderWidth: 3,

          pointRadius: 4,

          pointHoverRadius: 7,

          pointBorderWidth: 2,

          tension: 0.32,

          fill: false,

          spanGaps: false,
        },
      ],
    };
  });

  readonly chartOptions = computed<ChartOptions<'line'>>(() => {
    const darkMode = this.theme.mode() === 'dark';

    const textColor = darkMode ? '#d7dde8' : '#475569';

    const titleColor = darkMode ? '#f8fafc' : '#0f172a';

    const gridColor = darkMode ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.20)';

    const tooltipBackground = darkMode ? '#111827' : '#ffffff';

    const tooltipText = darkMode ? '#f8fafc' : '#0f172a';

    return {
      responsive: true,

      maintainAspectRatio: false,

      normalized: true,

      interaction: {
        intersect: false,

        mode: 'index',
      },

      animation: {
        duration: 450,
      },

      plugins: {
        legend: {
          display: true,

          position: 'bottom',

          labels: {
            color: textColor,

            usePointStyle: true,

            pointStyle: 'circle',

            padding: 24,

            boxWidth: 10,

            boxHeight: 10,

            font: {
              size: 12,

              weight: 600,
            },
          },
        },

        tooltip: {
          enabled: true,

          displayColors: true,

          backgroundColor: tooltipBackground,

          titleColor: titleColor,

          bodyColor: tooltipText,

          borderColor: gridColor,

          borderWidth: 1,

          padding: 13,

          boxPadding: 5,

          cornerRadius: 12,

          callbacks: {
            title: (items) => {
              const index = items[0]?.dataIndex;

              const day = this.comparison()?.days[index];

              if (!day) {
                return '';
              }

              return `${day.day_of_week} · ${this.formatDate(day.date)}`;
            },

            label: (context) => {
              const value = context.parsed.y;

              const label = context.dataset.label ?? 'Valor';

              if (value === null || value === undefined) {
                return `${label}: pendiente`;
              }

              return `${label}: ${this.formatNumber(value)} pizzas`;
            },

            afterBody: (items) => {
              const index = items[0]?.dataIndex;

              const day = this.comparison()?.days[index];

              if (!day) {
                return [];
              }

              const lines: string[] = [];

              if (day.difference !== null) {
                lines.push(`Diferencia: ${this.formatSignedNumber(day.difference)}`);
              }

              if (day.accuracy_percentage !== null) {
                lines.push(`Precisión: ${this.formatPercentage(day.accuracy_percentage)}`);
              }

              return lines;
            },
          },
        },
      },

      scales: {
        x: {
          offset: true,

          border: {
            display: false,
          },

          grid: {
            display: false,
          },

          ticks: {
            color: textColor,

            maxRotation: 0,

            minRotation: 0,

            autoSkip: true,

            maxTicksLimit: 10,

            padding: 8,

            font: {
              size: 11,

              weight: 500,
            },
          },
        },

        y: {
          beginAtZero: true,

          border: {
            display: false,
          },

          grid: {
            color: gridColor,
          },

          ticks: {
            color: textColor,

            precision: 0,

            padding: 8,

            font: {
              size: 11,
            },
          },

          title: {
            display: true,

            text: 'Cantidad de pizzas',

            color: textColor,

            padding: {
              bottom: 10,
            },

            font: {
              size: 12,

              weight: 600,
            },
          },
        },
      },
    };
  });
}
