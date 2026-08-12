import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { ChartData, ChartOptions } from 'chart.js';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { MachineLearningApiService } from '../../../core/api/machine-learning/machine-learning-api.service';
import {
  ForecastSizes,
  MachineLearningRemoteModel,
  MachineLearningRun,
} from '../../../core/api/machine-learning/machine-learning.models';
import { ThemeService } from '../../../core/state/theme.service';
import { OperationalTomorrowForecastComponent } from '../operational-tomorrow-forecast/operational-tomorrow-forecast';

interface ForecastSizeTotal {
  key: keyof ForecastSizes;
  label: string;
  value: number;
}

@Component({
  selector: 'app-ml-forecast-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    DialogModule,
    InputNumberModule,
    PaginatorModule,
    ProgressSpinnerModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
    OperationalTomorrowForecastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ml-forecast-dashboard.html',
  styleUrl: './ml-forecast-dashboard.scss',
})
export class MlForecastDashboardComponent implements OnInit {
  private readonly api = inject(MachineLearningApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly theme = inject(ThemeService);
  private readonly document = inject(DOCUMENT);

  readonly loading = signal(true);

  readonly historyLoading = signal(true);

  readonly modelLoading = signal(true);

  readonly generating = signal(false);

  readonly detailLoading = signal(false);

  readonly generateDialogVisible = signal(false);

  readonly detailDialogVisible = signal(false);

  readonly activeRun = signal<MachineLearningRun | null>(null);

  readonly remoteModel = signal<MachineLearningRemoteModel | null>(null);

  readonly history = signal<MachineLearningRun[]>([]);

  readonly selectedRun = signal<MachineLearningRun | null>(null);

  readonly historyPage = signal(1);

  readonly historyPerPage = signal(10);

  readonly historyTotal = signal(0);

  readonly minimumForecastDate = this.startOfToday();

  readonly generateForm = this.formBuilder.nonNullable.group({
    startDate: [this.tomorrow(), [Validators.required]],

    days: [7, [Validators.required, Validators.min(1), Validators.max(31)]],
  });

  readonly totalBySize = computed<ForecastSizes>(() => {
    const predictions = this.activeRun()?.predictions ?? [];

    return predictions.reduce(
      (totals, prediction) => ({
        mini: totals.mini + prediction.sizes.mini,

        small: totals.small + prediction.sizes.small,

        medium: totals.medium + prediction.sizes.medium,

        family: totals.family + prediction.sizes.family,

        giant: totals.giant + prediction.sizes.giant,
      }),

      {
        mini: 0,
        small: 0,
        medium: 0,
        family: 0,
        giant: 0,
      },
    );
  });

  readonly sizeTotals = computed<ForecastSizeTotal[]>(() => {
    const totals = this.totalBySize();

    return [
      {
        key: 'mini',
        label: 'Mini',
        value: totals.mini,
      },
      {
        key: 'small',
        label: 'Pequeña',
        value: totals.small,
      },
      {
        key: 'medium',
        label: 'Mediana',
        value: totals.medium,
      },
      {
        key: 'family',
        label: 'Familiar',
        value: totals.family,
      },
      {
        key: 'giant',
        label: 'Gigante',
        value: totals.giant,
      },
    ];
  });

  readonly visibleSizeTotals = computed(() => this.sizeTotals().filter((item) => item.value > 0));

  readonly highestDemandUnits = computed(() => this.activeRun()?.summary.highest_demand_units ?? 0);

  readonly demandChartData = computed<ChartData<'line'>>(() => {
    this.theme.mode();

    const predictions = this.activeRun()?.predictions ?? [];

    const primary = this.cssVariable('--p-primary-color', '#22c55e');

    return {
      labels: predictions.map((prediction) => this.shortDayLabel(prediction.day_of_week)),

      datasets: [
        {
          label: 'Demanda estimada',

          data: predictions.map((prediction) => prediction.total_units),

          borderColor: primary,

          backgroundColor: this.colorWithAlpha(primary, 0.2),

          pointBackgroundColor: primary,

          pointBorderColor: this.cssVariable('--p-content-background', '#ffffff'),

          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 3,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  });

  readonly demandChartOptions = computed<ChartOptions<'line'>>(() => {
    this.theme.mode();

    const textColor = this.cssVariable('--p-text-muted-color', '#64748b');

    const gridColor = this.colorWithAlpha(this.cssVariable('--p-text-color', '#111827'), 0.09);

    return {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: 'index',
      },

      plugins: {
        legend: {
          display: false,
        },

        tooltip: {
          displayColors: false,

          callbacks: {
            label: (context) => `${context.parsed.y} pizzas`,
          },
        },
      },

      scales: {
        x: {
          grid: {
            display: false,
          },

          ticks: {
            color: textColor,
            maxRotation: 0,
            autoSkip: true,
          },

          border: {
            display: false,
          },
        },

        y: {
          beginAtZero: true,

          suggestedMax: this.highestDemandUnits() + 2,

          ticks: {
            color: textColor,
            precision: 0,
            stepSize: 2,
          },

          grid: {
            color: gridColor,
          },

          border: {
            display: false,
          },
        },
      },
    };
  });

  readonly sizeChartData = computed<ChartData<'doughnut'>>(() => {
    this.theme.mode();

    const totals = this.visibleSizeTotals();

    const fallbackTotals =
      totals.length > 0
        ? totals
        : [
            {
              key: 'medium' as keyof ForecastSizes,

              label: 'Sin información',

              value: 1,
            },
          ];

    return {
      labels: fallbackTotals.map((item) => item.label),

      datasets: [
        {
          data: fallbackTotals.map((item) => item.value),

          backgroundColor: fallbackTotals.map((item) => this.sizeColor(item.key)),

          borderColor: this.cssVariable('--p-content-background', '#ffffff'),

          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  });

  readonly sizeChartOptions = computed<ChartOptions<'doughnut'>>(() => {
    this.theme.mode();

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',

      plugins: {
        legend: {
          position: 'bottom',

          labels: {
            color: this.cssVariable('--p-text-muted-color', '#64748b'),

            usePointStyle: true,
            pointStyle: 'circle',
            padding: 18,
          },
        },
      },
    };
  });

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loadLatest();
    this.loadHistory();
    this.loadRemoteModel();
  }

  openGenerateDialog(): void {
    this.generateForm.reset({
      startDate: this.tomorrow(),
      days: 7,
    });

    this.generateDialogVisible.set(true);
  }

  closeGenerateDialog(): void {
    if (this.generating()) {
      return;
    }

    this.generateDialogVisible.set(false);
  }

  onGenerateDialogVisibleChange(visible: boolean): void {
    if (!visible && this.generating()) {
      return;
    }

    this.generateDialogVisible.set(visible);
  }

  generateForecast(): void {
    if (this.generateForm.invalid || this.generating()) {
      this.generateForm.markAllAsTouched();

      return;
    }

    const value = this.generateForm.getRawValue();

    this.generating.set(true);

    this.api
      .generate({
        start_date: this.toApiDate(value.startDate),

        days: value.days,
      })
      .pipe(
        finalize(() => {
          this.generating.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.activeRun.set(response.data);

          this.generateDialogVisible.set(false);

          this.toast.add({
            severity: 'success',
            summary: 'Pronóstico generado',
            detail: response.message,
          });

          this.loadHistory();
          this.loadRemoteModel();
        },

        error: (error) => {
          this.showError('No se pudo generar el pronóstico', error);
        },
      });
  }

  openRunDetail(run: MachineLearningRun): void {
    this.selectedRun.set(null);
    this.detailLoading.set(true);
    this.detailDialogVisible.set(true);

    this.api
      .show(run.uuid)
      .pipe(
        finalize(() => {
          this.detailLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.selectedRun.set(response.data);
        },

        error: (error) => {
          this.detailDialogVisible.set(false);

          this.showError('No se pudo abrir el pronóstico', error);
        },
      });
  }

  closeDetailDialog(): void {
    this.detailDialogVisible.set(false);

    this.selectedRun.set(null);
  }

  onDetailDialogVisibleChange(visible: boolean): void {
    this.detailDialogVisible.set(visible);

    if (!visible) {
      this.selectedRun.set(null);
    }
  }

  onHistoryPageChange(event: PaginatorState): void {
    this.historyPage.set((event.page ?? 0) + 1);

    this.historyPerPage.set(event.rows ?? this.historyPerPage());

    this.loadHistory();
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = this.parseDate(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  formatDateTime(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  formatMetric(
    value: string | number | null | undefined,

    decimals = 2,
  ): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat('es-EC', {
      minimumFractionDigits: decimals,

      maximumFractionDigits: decimals,
    }).format(numeric);
  }

  formatCurrency(value: string | number | null | undefined): string {
    const numeric = Number(value ?? 0);

    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(Number.isFinite(numeric) ? numeric : 0);
  }

  sizeLabel(size: string | null | undefined): string {
    switch (size) {
      case 'mini':
        return 'Mini';

      case 'small':
        return 'Pequeña';

      case 'medium':
        return 'Mediana';

      case 'family':
        return 'Familiar';

      case 'giant':
        return 'Gigante';

      default:
        return size || '—';
    }
  }

  sourceLabel(source: string): string {
    switch (source) {
      case 'ml_service':
        return 'Servicio predictivo';

      case 'google_colab':
        return 'Google Colab';

      default:
        return source;
    }
  }

  sourceSeverity(source: string): 'success' | 'info' | 'secondary' {
    switch (source) {
      case 'ml_service':
        return 'success';

      case 'google_colab':
        return 'info';

      default:
        return 'secondary';
    }
  }

  runStatusLabel(run: MachineLearningRun): string {
    return run.model.is_active ? 'Activo' : 'Histórico';
  }

  runStatusSeverity(run: MachineLearningRun): 'success' | 'secondary' {
    return run.model.is_active ? 'success' : 'secondary';
  }

  private loadLatest(): void {
    this.loading.set(true);

    this.api
      .latest()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.activeRun.set(response.data);
        },

        error: (error) => {
          this.showError('No se pudo cargar el pronóstico', error);
        },
      });
  }

  private loadHistory(): void {
    this.historyLoading.set(true);

    this.api
      .history(this.historyPage(), this.historyPerPage())
      .pipe(
        finalize(() => {
          this.historyLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.history.set(response.data);

          this.historyTotal.set(response.meta.total);
        },

        error: (error) => {
          this.showError('No se pudo cargar el historial', error);
        },
      });
  }

  private loadRemoteModel(): void {
    this.modelLoading.set(true);

    this.api
      .remoteModel()
      .pipe(
        finalize(() => {
          this.modelLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.remoteModel.set(response.data);
        },

        error: () => {
          this.remoteModel.set(null);
        },
      });
  }

  private showError(summary: string, error: unknown): void {
    const responseError = error as {
      error?: {
        message?: string;
      };
    };

    this.toast.add({
      severity: 'error',
      summary,
      detail: responseError?.error?.message ?? 'Ocurrió un error al consultar el servidor.',
    });
  }

  private startOfToday(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }

  private tomorrow(): Date {
    const date = this.startOfToday();

    date.setDate(date.getDate() + 1);

    return date;
  }

  private toApiDate(date: Date): string {
    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);

      return new Date(year, month - 1, day);
    }

    return new Date(value);
  }

  private shortDayLabel(day: string): string {
    const labels: Record<string, string> = {
      Lunes: 'Lun',
      Martes: 'Mar',
      Miércoles: 'Mié',
      Miercoles: 'Mié',
      Jueves: 'Jue',
      Viernes: 'Vie',
      Sábado: 'Sáb',
      Sabado: 'Sáb',
      Domingo: 'Dom',
    };

    return labels[day] ?? day;
  }

  private sizeColor(size: keyof ForecastSizes): string {
    const colors: Record<keyof ForecastSizes, string> = {
      mini: this.cssVariable('--p-blue-500', '#3b82f6'),

      small: this.cssVariable('--p-pink-500', '#ec4899'),

      medium: this.cssVariable('--p-orange-500', '#f97316'),

      family: this.cssVariable('--p-yellow-500', '#eab308'),

      giant: this.cssVariable('--p-teal-500', '#14b8a6'),
    };

    return colors[size];
  }

  private cssVariable(property: string, fallback: string): string {
    const value = getComputedStyle(this.document.documentElement).getPropertyValue(property).trim();

    return value || fallback;
  }

  private colorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');

      const normalized =
        hex.length === 3
          ? hex
              .split('')
              .map((character) => character + character)
              .join('')
          : hex;

      const value = Number.parseInt(normalized, 16);

      const red = (value >> 16) & 255;

      const green = (value >> 8) & 255;

      const blue = value & 255;

      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    return color;
  }
}
