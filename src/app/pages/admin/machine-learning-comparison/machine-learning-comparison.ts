import {
  CommonModule,
} from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  finalize,
} from 'rxjs';

import {
  ChartData,
  ChartOptions,
} from 'chart.js';

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
  TagModule,
} from 'primeng/tag';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  MachineLearningApiService,
} from '../../../core/api/machine-learning/machine-learning-api.service';
import {
  ForecastSizes,
  MachineLearningComparison,
  MachineLearningComparisonDay,
  MachineLearningComparisonStatus,
} from '../../../core/api/machine-learning/machine-learning.models';
import {
  ThemeService,
} from '../../../core/state/theme.service';

interface SizeComparisonItem {
  key: keyof ForecastSizes;
  label: string;
  predicted: number;
  actual: number | null;
  difference: number | null;
}

@Component({
  selector:
    'app-machine-learning-comparison',

  standalone:
    true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ChartModule,
    DatePickerModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],

  templateUrl:
    './machine-learning-comparison.html',

  styleUrl:
    './machine-learning-comparison.scss',
})
export class MachineLearningComparisonComponent
  implements OnInit
{
  private readonly api =
    inject(
      MachineLearningApiService,
    );

  private readonly formBuilder =
    inject(
      FormBuilder,
    );

  private readonly toast =
    inject(
      MessageService,
    );

  private readonly destroyRef =
    inject(
      DestroyRef,
    );

  private readonly theme =
    inject(
      ThemeService,
    );

  /*
  |--------------------------------------------------------------------------
  | Estado principal
  |--------------------------------------------------------------------------
  */

  readonly loading =
    signal(
      true,
    );

  readonly comparison =
    signal<MachineLearningComparison | null>(
      null,
    );

  readonly expandedDate =
    signal<string | null>(
      null,
    );

  /*
  |--------------------------------------------------------------------------
  | Fechas permitidas
  |--------------------------------------------------------------------------
  */

  readonly todayDate =
    this.today();

  readonly minimumDate =
    this.daysAgo(
      30,
    );

  /*
  |--------------------------------------------------------------------------
  | Filtro de comparación
  |--------------------------------------------------------------------------
  */

  readonly filterForm =
    this.formBuilder
      .nonNullable
      .group({
        dateFrom: [
          this.daysAgo(
            30,
          ),
          [
            Validators.required,
          ],
        ],

        dateTo: [
          this.today(),
          [
            Validators.required,
          ],
        ],
      });

  /*
  |--------------------------------------------------------------------------
  | Datos calculados
  |--------------------------------------------------------------------------
  */

  readonly hasResults =
    computed(
      () =>
        (
          this.comparison()
            ?.days
            .length ?? 0
        ) > 0,
    );

  readonly completedDays =
    computed(
      () =>
        this.comparison()
          ?.days
          .filter(
            day =>
              day.status ===
              'completed',
          ) ?? [],
    );

  readonly bestDay =
    computed<MachineLearningComparisonDay | null>(
      () => {
        const completed =
          this.completedDays()
            .filter(
              day =>
                day.accuracy_percentage !==
                null,
            );

        if (
          completed.length === 0
        ) {
          return null;
        }

        return completed.reduce(
          (
            best,
            current,
          ) =>
            (
              current.accuracy_percentage ??
              0
            ) >
            (
              best.accuracy_percentage ??
              0
            )
              ? current
              : best,
        );
      },
    );

  readonly worstDay =
    computed<MachineLearningComparisonDay | null>(
      () => {
        const completed =
          this.completedDays()
            .filter(
              day =>
                day.accuracy_percentage !==
                null,
            );

        if (
          completed.length === 0
        ) {
          return null;
        }

        return completed.reduce(
          (
            worst,
            current,
          ) =>
            (
              current.accuracy_percentage ??
              0
            ) <
            (
              worst.accuracy_percentage ??
              0
            )
              ? current
              : worst,
        );
      },
    );

  readonly totalNetSales =
    computed(
      () =>
        this.comparison()
          ?.days
          .reduce(
            (
              total,
              day,
            ) =>
              total +
              (
                day.actual_net_sales ??
                0
              ),
            0,
          ) ?? 0,
    );

  readonly totalDeliveredOrders =
    computed(
      () =>
        this.comparison()
          ?.days
          .reduce(
            (
              total,
              day,
            ) =>
              total +
              (
                day.delivered_orders ??
                0
              ),
            0,
          ) ?? 0,
    );

  readonly chartData =
    computed<ChartData<'line'>>(
      () => {
        const darkMode =
          this.theme.mode() ===
          'dark';

        const predictedColor =
          darkMode
            ? '#facc15'
            : '#ca8a04';

        const actualColor =
          darkMode
            ? '#4ade80'
            : '#16a34a';

        const predictedBackground =
          darkMode
            ? 'rgba(250, 204, 21, 0.12)'
            : 'rgba(202, 138, 4, 0.10)';

        const actualBackground =
          darkMode
            ? 'rgba(74, 222, 128, 0.12)'
            : 'rgba(22, 163, 74, 0.10)';

        const days =
          this.comparison()
            ?.days ?? [];

        return {
          labels:
            days.map(
              day =>
                this.formatShortDate(
                  day.date,
                ),
            ),

          datasets: [
            {
              label:
                'Predicción',

              data:
                days.map(
                  day =>
                    day.predicted_total,
                ),

              borderColor:
                predictedColor,

              backgroundColor:
                predictedBackground,

              pointBackgroundColor:
                predictedColor,

              pointBorderColor:
                darkMode
                  ? '#111827'
                  : '#ffffff',

              borderWidth:
                3,

              pointRadius:
                4,

              pointHoverRadius:
                7,

              pointBorderWidth:
                2,

              tension:
                0.32,

              fill:
                false,
            },

            {
              label:
                'Ventas reales',

              data:
                days.map(
                  day =>
                    day.actual_total,
                ),

              borderColor:
                actualColor,

              backgroundColor:
                actualBackground,

              pointBackgroundColor:
                actualColor,

              pointBorderColor:
                darkMode
                  ? '#111827'
                  : '#ffffff',

              borderWidth:
                3,

              pointRadius:
                4,

              pointHoverRadius:
                7,

              pointBorderWidth:
                2,

              tension:
                0.32,

              fill:
                false,

              spanGaps:
                false,
            },
          ],
        };
      },
    );

  readonly chartOptions =
    computed<ChartOptions<'line'>>(
      () => {
        const darkMode =
          this.theme.mode() ===
          'dark';

        const textColor =
          darkMode
            ? '#d7dde8'
            : '#475569';

        const titleColor =
          darkMode
            ? '#f8fafc'
            : '#0f172a';

        const gridColor =
          darkMode
            ? 'rgba(148, 163, 184, 0.14)'
            : 'rgba(148, 163, 184, 0.20)';

        const tooltipBackground =
          darkMode
            ? '#111827'
            : '#ffffff';

        const tooltipText =
          darkMode
            ? '#f8fafc'
            : '#0f172a';

        return {
          responsive:
            true,

          maintainAspectRatio:
            false,

          normalized:
            true,

          interaction: {
            intersect:
              false,

            mode:
              'index',
          },

          animation: {
            duration:
              450,
          },

          plugins: {
            legend: {
              display:
                true,

              position:
                'bottom',

              labels: {
                color:
                  textColor,

                usePointStyle:
                  true,

                pointStyle:
                  'circle',

                padding:
                  24,

                boxWidth:
                  10,

                boxHeight:
                  10,

                font: {
                  size:
                    12,

                  weight:
                    600,
                },
              },
            },

            tooltip: {
              enabled:
                true,

              displayColors:
                true,

              backgroundColor:
                tooltipBackground,

              titleColor:
                titleColor,

              bodyColor:
                tooltipText,

              borderColor:
                gridColor,

              borderWidth:
                1,

              padding:
                13,

              boxPadding:
                5,

              cornerRadius:
                12,

              callbacks: {
                title:
                  items => {
                    const index =
                      items[0]
                        ?.dataIndex;

                    const day =
                      this.comparison()
                        ?.days[index];

                    if (
                      !day
                    ) {
                      return '';
                    }

                    return `${
                      day.day_of_week
                    } · ${this.formatDate(
                      day.date,
                    )}`;
                  },

                label:
                  context => {
                    const value =
                      context.parsed.y;

                    const label =
                      context.dataset.label ??
                      'Valor';

                    if (
                      value === null ||
                      value === undefined
                    ) {
                      return `${label}: pendiente`;
                    }

                    return `${label}: ${this.formatNumber(
                      value,
                    )} pizzas`;
                  },

                afterBody:
                  items => {
                    const index =
                      items[0]
                        ?.dataIndex;

                    const day =
                      this.comparison()
                        ?.days[index];

                    if (
                      !day
                    ) {
                      return [];
                    }

                    const lines: string[] =
                      [];

                    if (
                      day.difference !==
                      null
                    ) {
                      lines.push(
                        `Diferencia: ${this.formatSignedNumber(
                          day.difference,
                        )}`,
                      );
                    }

                    if (
                      day.accuracy_percentage !==
                      null
                    ) {
                      lines.push(
                        `Precisión: ${this.formatPercentage(
                          day.accuracy_percentage,
                        )}`,
                      );
                    }

                    return lines;
                  },
              },
            },
          },

          scales: {
            x: {
              offset:
                true,

              border: {
                display:
                  false,
              },

              grid: {
                display:
                  false,
              },

              ticks: {
                color:
                  textColor,

                maxRotation:
                  0,

                minRotation:
                  0,

                autoSkip:
                  true,

                maxTicksLimit:
                  10,

                padding:
                  8,

                font: {
                  size:
                    11,

                  weight:
                    500,
                },
              },
            },

            y: {
              beginAtZero:
                true,

              border: {
                display:
                  false,
              },

              grid: {
                color:
                  gridColor,
              },

              ticks: {
                color:
                  textColor,

                precision:
                  0,

                padding:
                  8,

                font: {
                  size:
                    11,
                },
              },

              title: {
                display:
                  true,

                text:
                  'Cantidad de pizzas',

                color:
                  textColor,

                padding: {
                  bottom:
                    10,
                },

                font: {
                  size:
                    12,

                  weight:
                    600,
                },
              },
            },
          },
        };
      },
    );

  /*
  |--------------------------------------------------------------------------
  | Ciclo de vida
  |--------------------------------------------------------------------------
  */

  ngOnInit(): void {
    this.loadComparison();
  }

  /*
  |--------------------------------------------------------------------------
  | Consulta principal
  |--------------------------------------------------------------------------
  */

  loadComparison(): void {
    if (
      this.filterForm.invalid
    ) {
      this.filterForm
        .markAllAsTouched();

      this.showWarning(
        'Selecciona una fecha inicial y una fecha final.',
      );

      return;
    }

    const value =
      this.filterForm
        .getRawValue();

    const dateFrom =
      this.normalizeDate(
        value.dateFrom,
      );

    const dateTo =
      this.normalizeDate(
        value.dateTo,
      );

    if (
      dateFrom.getTime() >
      dateTo.getTime()
    ) {
      this.showWarning(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );

      return;
    }

    const difference =
      this.daysBetween(
        dateFrom,
        dateTo,
      );

    if (
      difference > 30
    ) {
      this.showWarning(
        'El periodo de comparación no puede superar los 31 días.',
      );

      return;
    }

    this.loading.set(
      true,
    );

    this.expandedDate.set(
      null,
    );

    this.api
      .comparison({
        date_from:
          this.toApiDate(
            dateFrom,
          ),

        date_to:
          this.toApiDate(
            dateTo,
          ),
      })
      .pipe(
        finalize(
          () =>
            this.loading.set(
              false,
            ),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next:
          response => {
            this.comparison.set(
              response.data,
            );
          },

        error:
          error => {
            this.comparison.set(
              null,
            );

            this.toast.add({
              severity:
                'error',

              summary:
                'No se pudo cargar la comparación',

              detail:
                error
                  ?.error
                  ?.message ??
                'Ocurrió un error al consultar las ventas y las predicciones.',

              life:
                5000,
            });
          },
      });
  }

  resetRange(): void {
    this.filterForm
      .setValue({
        dateFrom:
          this.daysAgo(
            30,
          ),

        dateTo:
          this.today(),
      });

    this.loadComparison();
  }

  /*
  |--------------------------------------------------------------------------
  | Expansión de filas
  |--------------------------------------------------------------------------
  */

  toggleDay(
    date: string,
  ): void {
    this.expandedDate.set(
      this.expandedDate() ===
      date
        ? null
        : date,
    );
  }

  isExpanded(
    date: string,
  ): boolean {
    return (
      this.expandedDate() ===
      date
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Desglose por tamaños
  |--------------------------------------------------------------------------
  */

  sizeComparison(
    day: MachineLearningComparisonDay,
  ): SizeComparisonItem[] {
    return [
      this.createSizeItem(
        'mini',
        'Mini',
        day,
      ),

      this.createSizeItem(
        'small',
        'Pequeña',
        day,
      ),

      this.createSizeItem(
        'medium',
        'Mediana',
        day,
      ),

      this.createSizeItem(
        'family',
        'Familiar',
        day,
      ),

      this.createSizeItem(
        'giant',
        'Gigante',
        day,
      ),
    ];
  }

  /*
  |--------------------------------------------------------------------------
  | Estado de cada fecha
  |--------------------------------------------------------------------------
  */

  statusLabel(
    status: MachineLearningComparisonStatus,
  ): string {
    switch (
      status
    ) {
      case 'completed':
        return 'Finalizado';

      case 'in_progress':
        return 'En curso';

      case 'pending':
        return 'Pendiente';
    }
  }

  statusSeverity(
    status: MachineLearningComparisonStatus,
  ):
    | 'success'
    | 'info'
    | 'warn' {
    switch (
      status
    ) {
      case 'completed':
        return 'success';

      case 'in_progress':
        return 'info';

      case 'pending':
        return 'warn';
    }
  }

  statusIcon(
    status: MachineLearningComparisonStatus,
  ): string {
    switch (
      status
    ) {
      case 'completed':
        return 'pi pi-check-circle';

      case 'in_progress':
        return 'pi pi-clock';

      case 'pending':
        return 'pi pi-hourglass';
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Diferencia entre resultado y predicción
  |--------------------------------------------------------------------------
  */

  differenceClass(
    value:
      | number
      | null,
  ): string {
    if (
      value === null ||
      value === 0
    ) {
      return 'metric-neutral';
    }

    return value > 0
      ? 'metric-positive'
      : 'metric-negative';
  }

  differenceLabel(
    value:
      | number
      | null,
  ): string {
    if (
      value === null
    ) {
      return 'Resultado pendiente';
    }

    if (
      value === 0
    ) {
      return 'Coincidencia exacta';
    }

    if (
      value > 0
    ) {
      return `${this.formatNumber(
        value,
      )} sobre lo previsto`;
    }

    return `${this.formatNumber(
      Math.abs(
        value,
      ),
    )} bajo lo previsto`;
  }

  /*
  |--------------------------------------------------------------------------
  | Precisión
  |--------------------------------------------------------------------------
  */

  accuracyClass(
    accuracy:
      | number
      | null,
  ): string {
    if (
      accuracy === null
    ) {
      return 'accuracy-pending';
    }

    if (
      accuracy >= 90
    ) {
      return 'accuracy-excellent';
    }

    if (
      accuracy >= 75
    ) {
      return 'accuracy-good';
    }

    return 'accuracy-low';
  }

  accuracyDescription(
    accuracy:
      | number
      | null,
  ): string {
    if (
      accuracy === null
    ) {
      return 'Sin resultado definitivo';
    }

    if (
      accuracy >= 90
    ) {
      return 'Predicción muy precisa';
    }

    if (
      accuracy >= 75
    ) {
      return 'Precisión aceptable';
    }

    return 'Requiere más datos o ajuste';
  }

  /*
  |--------------------------------------------------------------------------
  | Formateadores
  |--------------------------------------------------------------------------
  */

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (
      !value
    ) {
      return '—';
    }

    const date =
      this.parseApiDate(
        value,
      );

    return new Intl.DateTimeFormat(
      'es-EC',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',
      },
    ).format(
      date,
    );
  }

  formatNumber(
    value:
      | number
      | null
      | undefined,

    digits = 0,
  ): string {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      return '—';
    }

    return new Intl.NumberFormat(
      'es-EC',
      {
        minimumFractionDigits:
          digits,

        maximumFractionDigits:
          digits,
      },
    ).format(
      value,
    );
  }

  formatSignedNumber(
    value:
      | number
      | null
      | undefined,
  ): string {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      return '—';
    }

    const prefix =
      value > 0
        ? '+'
        : '';

    return `${prefix}${this.formatNumber(
      value,
    )}`;
  }

  formatPercentage(
    value:
      | number
      | null
      | undefined,
  ): string {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      return '—';
    }

    return `${this.formatNumber(
      value,
      2,
    )} %`;
  }

  formatCurrency(
    value:
      | number
      | null
      | undefined,
  ): string {
    if (
      value === null ||
      value === undefined ||
      !Number.isFinite(
        value,
      )
    ) {
      return '—';
    }

    return new Intl.NumberFormat(
      'es-EC',
      {
        style:
          'currency',

        currency:
          'USD',

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      },
    ).format(
      value,
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Métodos privados
  |--------------------------------------------------------------------------
  */

  private createSizeItem(
    key: keyof ForecastSizes,
    label: string,
    day: MachineLearningComparisonDay,
  ): SizeComparisonItem {
    const predicted =
      day.predicted_sizes[key];

    const actual =
      day.actual_sizes
        ? day.actual_sizes[key]
        : null;

    return {
      key,
      label,
      predicted,
      actual,

      difference:
        actual === null
          ? null
          : actual -
            predicted,
    };
  }

  private today(): Date {
    const date =
      new Date();

    date.setHours(
      0,
      0,
      0,
      0,
    );

    return date;
  }

  private daysAgo(
    days: number,
  ): Date {
    const date =
      this.today();

    date.setDate(
      date.getDate() -
      days,
    );

    return date;
  }

  private normalizeDate(
    value: Date,
  ): Date {
    const date =
      new Date(
        value,
      );

    date.setHours(
      0,
      0,
      0,
      0,
    );

    return date;
  }

  private daysBetween(
    from: Date,
    to: Date,
  ): number {
    const dayMilliseconds =
      86_400_000;

    const fromTimestamp =
      Date.UTC(
        from.getFullYear(),
        from.getMonth(),
        from.getDate(),
      );

    const toTimestamp =
      Date.UTC(
        to.getFullYear(),
        to.getMonth(),
        to.getDate(),
      );

    return Math.round(
      (
        toTimestamp -
        fromTimestamp
      ) /
      dayMilliseconds,
    );
  }

  private toApiDate(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() +
        1,
      ).padStart(
        2,
        '0',
      );

    const day =
      String(
        date.getDate(),
      ).padStart(
        2,
        '0',
      );

    return `${year}-${month}-${day}`;
  }

  private parseApiDate(
    value: string,
  ): Date {
    const [
      year,
      month,
      day,
    ] =
      value
        .substring(
          0,
          10,
        )
        .split(
          '-',
        )
        .map(
          Number,
        );

    return new Date(
      year,
      month - 1,
      day,
    );
  }

  private formatShortDate(
    value: string,
  ): string {
    const date =
      this.parseApiDate(
        value,
      );

    return new Intl.DateTimeFormat(
      'es-EC',
      {
        day:
          '2-digit',

        month:
          'short',
      },
    ).format(
      date,
    );
  }

  private showWarning(
    detail: string,
  ): void {
    this.toast.add({
      severity:
        'warn',

      summary:
        'Revisa el periodo',

      detail,

      life:
        4500,
    });
  }
}
