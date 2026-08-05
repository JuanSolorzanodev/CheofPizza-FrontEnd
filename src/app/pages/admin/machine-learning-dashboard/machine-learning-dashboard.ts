import {
  CommonModule,
  DOCUMENT,
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
  ConfirmationService,
  MessageService,
} from 'primeng/api';
import {
  ButtonModule,
} from 'primeng/button';
import {
  ChartModule,
} from 'primeng/chart';
import {
  ConfirmDialogModule,
} from 'primeng/confirmdialog';
import {
  DatePickerModule,
} from 'primeng/datepicker';
import {
  DialogModule,
} from 'primeng/dialog';
import {
  DividerModule,
} from 'primeng/divider';
import {
  InputNumberModule,
} from 'primeng/inputnumber';
import {
  PaginatorModule,
  PaginatorState,
} from 'primeng/paginator';
import {
  ProgressBarModule,
} from 'primeng/progressbar';
import {
  ProgressSpinnerModule,
} from 'primeng/progressspinner';
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
  ForecastPrediction,
  ForecastSizes,
  MachineLearningRemoteModel,
  MachineLearningRun,
  MachineLearningTrainingRun,
  ModelRegistry,
  ModelRegistryReference,
  TrainingCandidateMetric,
  TrainingDatasetMaturity,
  TrainingPreviewResult,
} from '../../../core/api/machine-learning/machine-learning.models';
import {
  ThemeService,
} from '../../../core/state/theme.service';

type DashboardSection =
  | 'forecast'
  | 'training';

interface ForecastSizeTotal {
  key: keyof ForecastSizes;
  label: string;
  value: number;
}

@Component({
  selector:
    'app-machine-learning-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    ChartModule,
    ConfirmDialogModule,
    DatePickerModule,
    DialogModule,
    DividerModule,
    InputNumberModule,
    PaginatorModule,
    ProgressBarModule,
    ProgressSpinnerModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  providers: [
    ConfirmationService,
  ],
  templateUrl:
    './machine-learning-dashboard.html',
  styleUrl:
    './machine-learning-dashboard.scss',
})
export class MachineLearningDashboard
  implements OnInit
{
  private readonly api =
    inject(MachineLearningApiService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly toast =
    inject(MessageService);

  private readonly confirmation =
    inject(ConfirmationService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly theme =
    inject(ThemeService);

  private readonly document =
    inject(DOCUMENT);

  /*
  |--------------------------------------------------------------------------
  | Navegación interna
  |--------------------------------------------------------------------------
  */

  readonly activeSection =
    signal<DashboardSection>(
      'forecast',
    );

  /*
  |--------------------------------------------------------------------------
  | Estado de pronósticos
  |--------------------------------------------------------------------------
  */

  readonly loading =
    signal(true);

  readonly historyLoading =
    signal(true);

  readonly modelLoading =
    signal(true);

  readonly generating =
    signal(false);

  readonly detailLoading =
    signal(false);

  readonly generateDialogVisible =
    signal(false);

  readonly detailDialogVisible =
    signal(false);

  readonly activeRun =
    signal<MachineLearningRun | null>(
      null,
    );

  readonly remoteModel =
    signal<MachineLearningRemoteModel | null>(
      null,
    );

  readonly history =
    signal<MachineLearningRun[]>([]);

  readonly selectedRun =
    signal<MachineLearningRun | null>(
      null,
    );

  readonly historyPage =
    signal(1);

  readonly historyPerPage =
    signal(10);

  readonly historyTotal =
    signal(0);

  /*
  |--------------------------------------------------------------------------
  | Estado de entrenamiento
  |--------------------------------------------------------------------------
  */

  readonly trainingLoading =
    signal(true);

  readonly registryLoading =
    signal(true);

  readonly trainingRunsLoading =
    signal(true);

  readonly previewingTraining =
    signal(false);

  readonly buildingCandidate =
    signal(false);

  readonly rollingBack =
    signal(false);

  readonly activatingRunUuid =
    signal<string | null>(
      null,
    );

  readonly trainingDetailLoading =
    signal(false);

  readonly trainingDetailDialogVisible =
    signal(false);

  readonly registry =
    signal<ModelRegistry | null>(
      null,
    );

  readonly trainingPreview =
    signal<TrainingPreviewResult | null>(
      null,
    );

  readonly trainingRuns =
    signal<MachineLearningTrainingRun[]>(
      [],
    );

  readonly selectedTrainingRun =
    signal<MachineLearningTrainingRun | null>(
      null,
    );

  readonly trainingPage =
    signal(1);

  readonly trainingPerPage =
    signal(10);

  readonly trainingTotal =
    signal(0);

  readonly minimumForecastDate =
    this.startOfToday();

  readonly generateForm =
    this.formBuilder.nonNullable.group({
      startDate: [
        this.tomorrow(),
        [
          Validators.required,
        ],
      ],

      days: [
        7,
        [
          Validators.required,
          Validators.min(1),
          Validators.max(31),
        ],
      ],
    });

  /*
  |--------------------------------------------------------------------------
  | Cálculos del pronóstico
  |--------------------------------------------------------------------------
  */

  readonly totalBySize =
    computed<ForecastSizes>(() => {
      const predictions =
        this.activeRun()?.predictions ??
        [];

      return predictions.reduce(
        (
          totals,
          prediction,
        ) => ({
          mini:
            totals.mini +
            prediction.sizes.mini,

          small:
            totals.small +
            prediction.sizes.small,

          medium:
            totals.medium +
            prediction.sizes.medium,

          family:
            totals.family +
            prediction.sizes.family,

          giant:
            totals.giant +
            prediction.sizes.giant,
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

  readonly sizeTotals =
    computed<ForecastSizeTotal[]>(() => {
      const totals =
        this.totalBySize();

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

  readonly visibleSizeTotals =
    computed(() =>
      this.sizeTotals().filter(
        item => item.value > 0,
      ),
    );

  readonly highestDemandUnits =
    computed(
      () =>
        this.activeRun()
          ?.summary
          .highest_demand_units ??
        0,
    );

  /*
  |--------------------------------------------------------------------------
  | Cálculos del entrenamiento
  |--------------------------------------------------------------------------
  */

  readonly datasetMaturity =
    computed<TrainingDatasetMaturity | null>(
      () =>
        this.trainingPreview()
          ?.dataset
          .maturity ??
        null,
    );

  readonly datasetSummary =
    computed(
      () =>
        this.trainingPreview()
          ?.dataset
          .summary ??
        null,
    );

  readonly activeRegistryModel =
    computed<ModelRegistryReference | null>(
      () =>
        this.registry()?.active ??
        null,
    );

  readonly maturityProgress =
    computed(() => {
      const maturity =
        this.datasetMaturity();

      if (!maturity) {
        return 0;
      }

      const target =
        Math.max(
          1,
          maturity
            .recommended_training_days,
        );

      return Math.min(
        100,
        Math.round(
          (
            maturity.active_days /
            target
          ) * 100,
        ),
      );
    });

  readonly experimentalProgress =
    computed(() => {
      const maturity =
        this.datasetMaturity();

      if (!maturity) {
        return 0;
      }

      const target =
        Math.max(
          1,
          maturity
            .minimum_training_days,
        );

      return Math.min(
        100,
        Math.round(
          (
            maturity.active_days /
            target
          ) * 100,
        ),
      );
    });

  readonly canBuildCandidate =
    computed(
      () =>
        this.datasetMaturity()
          ?.can_train_experimental ===
        true,
    );

  readonly hasTrainingPreview =
    computed(
      () =>
        this.trainingPreview()
          ?.preview
          .trained === true,
    );

  readonly trainingWinner =
    computed(
      () =>
        this.trainingPreview()
          ?.preview
          .winner ??
        null,
    );

  readonly trainingCandidates =
    computed<TrainingCandidateMetric[]>(
      () =>
        this.trainingPreview()
          ?.preview
          .candidates ??
        [],
    );

  readonly rollbackAvailable =
    computed(
      () =>
        this.registry()
          ?.rollback_available ===
        true,
    );

  readonly activeHistoricalArtifactId =
    computed(() => {
      const active =
        this.activeRegistryModel();

      return active?.kind ===
        'historical'
        ? active.artifact_id
        : null;
    });

  readonly trainingBusy =
    computed(
      () =>
        this.previewingTraining() ||
        this.buildingCandidate() ||
        this.rollingBack() ||
        this.activatingRunUuid() !==
          null,
    );

  /*
  |--------------------------------------------------------------------------
  | Gráficas
  |--------------------------------------------------------------------------
  */

  readonly demandChartData =
    computed<ChartData<'line'>>(() => {
      this.theme.mode();

      const predictions =
        this.activeRun()?.predictions ??
        [];

      const primary =
        this.cssVariable(
          '--p-primary-color',
          '#22c55e',
        );

      return {
        labels: predictions.map(
          prediction =>
            this.shortDayLabel(
              prediction.day_of_week,
            ),
        ),

        datasets: [
          {
            label:
              'Demanda estimada',

            data: predictions.map(
              prediction =>
                prediction.total_units,
            ),

            borderColor:
              primary,

            backgroundColor:
              this.colorWithAlpha(
                primary,
                0.2,
              ),

            pointBackgroundColor:
              primary,

            pointBorderColor:
              this.cssVariable(
                '--p-content-background',
                '#ffffff',
              ),

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

  readonly demandChartOptions =
    computed<ChartOptions<'line'>>(
      () => {
        this.theme.mode();

        const textColor =
          this.cssVariable(
            '--p-text-muted-color',
            '#64748b',
          );

        const gridColor =
          this.colorWithAlpha(
            this.cssVariable(
              '--p-text-color',
              '#111827',
            ),
            0.09,
          );

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
                label: context =>
                  `${context.parsed.y} pizzas`,
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

              suggestedMax:
                this.highestDemandUnits() +
                2,

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
      },
    );

  readonly sizeChartData =
    computed<ChartData<'doughnut'>>(
      () => {
        this.theme.mode();

        const totals =
          this.visibleSizeTotals();

        const fallbackTotals =
          totals.length > 0
            ? totals
            : [
                {
                  key:
                    'medium' as keyof ForecastSizes,

                  label:
                    'Sin información',

                  value: 1,
                },
              ];

        return {
          labels:
            fallbackTotals.map(
              item => item.label,
            ),

          datasets: [
            {
              data:
                fallbackTotals.map(
                  item => item.value,
                ),

              backgroundColor:
                fallbackTotals.map(
                  item =>
                    this.sizeColor(
                      item.key,
                    ),
                ),

              borderColor:
                this.cssVariable(
                  '--p-content-background',
                  '#ffffff',
                ),

              borderWidth: 3,
              hoverOffset: 8,
            },
          ],
        };
      },
    );

  readonly sizeChartOptions =
    computed<
      ChartOptions<'doughnut'>
    >(() => {
      this.theme.mode();

      return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',

        plugins: {
          legend: {
            position: 'bottom',

            labels: {
              color:
                this.cssVariable(
                  '--p-text-muted-color',
                  '#64748b',
                ),

              usePointStyle: true,
              pointStyle: 'circle',
              padding: 18,
            },
          },
        },
      };
    });

  ngOnInit(): void {
    this.loadDashboard();
  }

  /*
  |--------------------------------------------------------------------------
  | Navegación
  |--------------------------------------------------------------------------
  */

  selectSection(
    section: DashboardSection,
  ): void {
    this.activeSection.set(
      section,
    );

    if (
      section === 'training' &&
      this.trainingPreview() === null
    ) {
      this.loadTrainingDashboard();
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Carga general
  |--------------------------------------------------------------------------
  */

  loadDashboard(): void {
    this.loadLatest();
    this.loadHistory();
    this.loadRemoteModel();

    if (
      this.activeSection() ===
      'training'
    ) {
      this.loadTrainingDashboard();
    }
  }

  loadTrainingDashboard(): void {
    this.trainingLoading.set(
      true,
    );

    this.loadRegistry();
    this.loadTrainingRuns();
    this.loadInitialTrainingPreview();
  }

  refreshActiveSection(): void {
    if (
      this.activeSection() ===
      'forecast'
    ) {
      this.loadDashboard();
      return;
    }

    this.loadTrainingDashboard();
  }

  /*
  |--------------------------------------------------------------------------
  | Pronóstico
  |--------------------------------------------------------------------------
  */

  openGenerateDialog(): void {
    this.generateForm.reset({
      startDate: this.tomorrow(),
      days: 7,
    });

    this.generateDialogVisible.set(
      true,
    );
  }

  closeGenerateDialog(): void {
    if (this.generating()) {
      return;
    }

    this.generateDialogVisible.set(
      false,
    );
  }

  onGenerateDialogVisibleChange(
    visible: boolean,
  ): void {
    if (
      !visible &&
      this.generating()
    ) {
      return;
    }

    this.generateDialogVisible.set(
      visible,
    );
  }

  generateForecast(): void {
    if (
      this.generateForm.invalid ||
      this.generating()
    ) {
      this.generateForm
        .markAllAsTouched();

      return;
    }

    const value =
      this.generateForm
        .getRawValue();

    this.generating.set(true);

    this.api
      .generate({
        start_date:
          this.toApiDate(
            value.startDate,
          ),

        days:
          value.days,
      })
      .pipe(
        finalize(() => {
          this.generating.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.activeRun.set(
            response.data,
          );

          this.generateDialogVisible.set(
            false,
          );

          this.toast.add({
            severity: 'success',
            summary:
              'Pronóstico generado',
            detail:
              response.message,
          });

          this.loadHistory();
          this.loadRemoteModel();
        },

        error: error => {
          this.showError(
            'No se pudo generar el pronóstico',
            error,
          );
        },
      });
  }

  openRunDetail(
    run: MachineLearningRun,
  ): void {
    this.selectedRun.set(null);
    this.detailLoading.set(true);
    this.detailDialogVisible.set(
      true,
    );

    this.api
      .show(run.uuid)
      .pipe(
        finalize(() => {
          this.detailLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.selectedRun.set(
            response.data,
          );
        },

        error: error => {
          this.detailDialogVisible.set(
            false,
          );

          this.showError(
            'No se pudo abrir el pronóstico',
            error,
          );
        },
      });
  }

  closeDetailDialog(): void {
    this.detailDialogVisible.set(
      false,
    );

    this.selectedRun.set(null);
  }

  onDetailDialogVisibleChange(
    visible: boolean,
  ): void {
    this.detailDialogVisible.set(
      visible,
    );

    if (!visible) {
      this.selectedRun.set(null);
    }
  }

  onHistoryPageChange(
    event: PaginatorState,
  ): void {
    this.historyPage.set(
      (event.page ?? 0) + 1,
    );

    this.historyPerPage.set(
      event.rows ??
        this.historyPerPage(),
    );

    this.loadHistory();
  }

  /*
  |--------------------------------------------------------------------------
  | Preview de entrenamiento
  |--------------------------------------------------------------------------
  */

  runTrainingPreview(): void {
    if (
      this.previewingTraining()
    ) {
      return;
    }

    this.previewingTraining.set(
      true,
    );

    this.api
      .previewTraining({
        limit: 365,
        include_empty_days: true,
      })
      .pipe(
        finalize(() => {
          this.previewingTraining.set(
            false,
          );

          this.trainingLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.trainingPreview.set(
            response.data,
          );

          this.toast.add({
            severity:
              response
                .data
                .preview
                .trained
                ? 'success'
                : 'info',

            summary:
              response
                .data
                .preview
                .trained
                ? 'Evaluación completada'
                : 'Dataset en recopilación',

            detail:
              response
                .data
                .preview
                .message,
          });
        },

        error: error => {
          this.showError(
            'No se pudo evaluar el dataset',
            error,
          );
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Construcción de candidato
  |--------------------------------------------------------------------------
  */

  confirmBuildCandidate(): void {
    if (
      !this.canBuildCandidate() ||
      this.buildingCandidate()
    ) {
      return;
    }

    const operational =
      this.datasetMaturity()
        ?.can_train_operational ===
      true;

    this.confirmation.confirm({
      header:
        'Construir candidato',

      icon:
        operational
          ? 'pi pi-sparkles'
          : 'pi pi-exclamation-triangle',

      message:
        operational
          ? (
              'Se entrenará un nuevo candidato con '
              + 'los datos disponibles. El modelo activo '
              + 'no cambiará automáticamente.'
            )
          : (
              'El dataset solo cumple el mínimo experimental. '
              + 'El candidato se construirá, pero deberá '
              + 'revisarse cuidadosamente antes de activarlo.'
            ),

      acceptLabel:
        'Construir candidato',

      rejectLabel:
        'Cancelar',

      acceptButtonStyleClass:
        'p-button-success',

      accept: () => {
        this.buildCandidate();
      },
    });
  }

  private buildCandidate(): void {
    this.buildingCandidate.set(
      true,
    );

    this.api
      .buildTrainingCandidate({
        limit: 365,
        include_empty_days: true,
      })
      .pipe(
        finalize(() => {
          this.buildingCandidate.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary:
              'Candidato construido',
            detail:
              response.message,
          });

          this.trainingPage.set(1);
          this.loadTrainingRuns();
          this.loadRegistry();
        },

        error: error => {
          this.showError(
            'No se pudo construir el candidato',
            error,
          );
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Activación
  |--------------------------------------------------------------------------
  */

  confirmActivateTrainingRun(
    run: MachineLearningTrainingRun,
  ): void {
    if (
      !this.isRunActivatable(run) ||
      this.activatingRunUuid() !==
        null
    ) {
      return;
    }

    this.confirmation.confirm({
      header:
        'Activar modelo candidato',

      icon:
        'pi pi-exclamation-triangle',

      message:
        (
          `Se activará ${
            run.artifact.algorithm_label
            ?? run.artifact.algorithm
            ?? 'el candidato seleccionado'
          }. `
          + 'A partir de ese momento los nuevos '
          + 'pronósticos usarán este modelo. '
          + 'El modelo anterior quedará disponible '
          + 'para rollback.'
        ),

      acceptLabel:
        'Activar modelo',

      rejectLabel:
        'Cancelar',

      acceptButtonStyleClass:
        'p-button-success',

      accept: () => {
        this.activateTrainingRun(
          run,
        );
      },
    });
  }

  private activateTrainingRun(
    run: MachineLearningTrainingRun,
  ): void {
    this.activatingRunUuid.set(
      run.uuid,
    );

    this.api
      .activateTrainingRun(
        run.uuid,
      )
      .pipe(
        finalize(() => {
          this.activatingRunUuid.set(
            null,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary:
              'Modelo activado',
            detail:
              response.message,
          });

          this.loadRegistry();
          this.loadTrainingRuns();
          this.loadRemoteModel();
        },

        error: error => {
          this.showError(
            'No se pudo activar el modelo',
            error,
          );
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Rollback
  |--------------------------------------------------------------------------
  */

  confirmRollback(): void {
    if (
      !this.rollbackAvailable() ||
      this.rollingBack()
    ) {
      return;
    }

    const active =
      this.activeRegistryModel();

    this.confirmation.confirm({
      header:
        'Restaurar modelo anterior',

      icon:
        'pi pi-history',

      message:
        (
          `El modelo activo ${
            active?.version ?? ''
          } será reemplazado por la versión anterior. `
          + 'Esta operación cambiará el modelo utilizado '
          + 'para los próximos pronósticos.'
        ),

      acceptLabel:
        'Ejecutar rollback',

      rejectLabel:
        'Cancelar',

      acceptButtonStyleClass:
        'p-button-danger',

      accept: () => {
        this.rollbackModel();
      },
    });
  }

  private rollbackModel(): void {
    this.rollingBack.set(true);

    this.api
      .rollbackTrainingModel()
      .pipe(
        finalize(() => {
          this.rollingBack.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.toast.add({
            severity: 'success',
            summary:
              'Modelo restaurado',
            detail:
              response.message,
          });

          this.loadRegistry();
          this.loadTrainingRuns();
          this.loadRemoteModel();
        },

        error: error => {
          this.showError(
            'No se pudo restaurar el modelo',
            error,
          );
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Detalle de entrenamiento
  |--------------------------------------------------------------------------
  */

  openTrainingRunDetail(
    run: MachineLearningTrainingRun,
  ): void {
    this.selectedTrainingRun.set(
      null,
    );

    this.trainingDetailLoading.set(
      true,
    );

    this.trainingDetailDialogVisible.set(
      true,
    );

    this.api
      .trainingRun(
        run.uuid,
      )
      .pipe(
        finalize(() => {
          this.trainingDetailLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.selectedTrainingRun.set(
            response.data,
          );
        },

        error: error => {
          this.trainingDetailDialogVisible.set(
            false,
          );

          this.showError(
            'No se pudo abrir el entrenamiento',
            error,
          );
        },
      });
  }

  onTrainingDetailVisibleChange(
    visible: boolean,
  ): void {
    this.trainingDetailDialogVisible.set(
      visible,
    );

    if (!visible) {
      this.selectedTrainingRun.set(
        null,
      );
    }
  }

  onTrainingPageChange(
    event: PaginatorState,
  ): void {
    this.trainingPage.set(
      (event.page ?? 0) + 1,
    );

    this.trainingPerPage.set(
      event.rows ??
        this.trainingPerPage(),
    );

    this.loadTrainingRuns();
  }

  /*
  |--------------------------------------------------------------------------
  | Presentación
  |--------------------------------------------------------------------------
  */

  registryKindLabel(
    kind:
      | string
      | null
      | undefined,
  ): string {
    switch (kind) {
      case 'legacy':
        return 'Modelo heredado';

      case 'historical':
        return 'Modelo histórico';

      default:
        return kind || 'Sin modelo';
    }
  }

  registryKindSeverity(
    kind:
      | string
      | null
      | undefined,
  ):
    | 'success'
    | 'info'
    | 'secondary' {
    return kind === 'historical'
      ? 'success'
      : kind === 'legacy'
        ? 'info'
        : 'secondary';
  }

  maturitySeverity():
    | 'success'
    | 'warn'
    | 'secondary'
    | 'info' {
    const maturity =
      this.datasetMaturity();

    if (
      maturity
        ?.can_train_operational
    ) {
      return 'success';
    }

    if (
      maturity
        ?.can_train_experimental
    ) {
      return 'warn';
    }

    return maturity
      ? 'secondary'
      : 'info';
  }

  trainingStatusLabel(
    status: string,
  ): string {
    switch (status) {
      case 'processing':
        return 'Procesando';

      case 'built':
        return 'Construido';

      case 'activated':
        return 'Activo';

      case 'rolled_back':
        return 'Reemplazado';

      case 'failed':
        return 'Fallido';

      default:
        return status;
    }
  }

  trainingStatusSeverity(
    status: string,
  ):
    | 'success'
    | 'info'
    | 'warn'
    | 'danger'
    | 'secondary' {
    switch (status) {
      case 'activated':
        return 'success';

      case 'built':
        return 'info';

      case 'processing':
        return 'warn';

      case 'failed':
        return 'danger';

      default:
        return 'secondary';
    }
  }

  algorithmLabel(
    algorithm:
      | string
      | null
      | undefined,
  ): string {
    switch (algorithm) {
      case 'mean_baseline':
        return 'Promedio base';

      case 'ridge':
        return 'Regresión Ridge';

      case 'random_forest':
        return 'Random Forest';

      default:
        return algorithm || '—';
    }
  }

  isRunActivatable(
    run: MachineLearningTrainingRun,
  ): boolean {
    return (
      (
        run.status === 'built' ||
        run.status === 'rolled_back'
      ) &&
      run.artifact.id !== null &&
      run.artifact.is_active ===
        false
    );
  }

  isRunActive(
    run: MachineLearningTrainingRun,
  ): boolean {
    return (
      run.artifact.is_active ||
      this.activeHistoricalArtifactId() ===
        run.artifact.id
    );
  }

  formatDate(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return '—';
    }

    const date =
      this.parseDate(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'es-EC',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    ).format(date);
  }

  formatDateTime(
    value:
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'es-EC',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    ).format(date);
  }

  formatMetric(
    value:
      | string
      | number
      | null
      | undefined,

    decimals = 2,
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const numeric =
      Number(value);

    if (
      Number.isNaN(numeric)
    ) {
      return String(value);
    }

    return new Intl.NumberFormat(
      'es-EC',
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals,
      },
    ).format(numeric);
  }

  formatCurrency(
    value:
      | string
      | number
      | null
      | undefined,
  ): string {
    const numeric =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
      },
    ).format(
      Number.isFinite(numeric)
        ? numeric
        : 0,
    );
  }

  sizeLabel(
    size:
      | string
      | null
      | undefined,
  ): string {
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

  sourceLabel(
    source: string,
  ): string {
    switch (source) {
      case 'ml_service':
        return 'Servicio predictivo';

      case 'google_colab':
        return 'Google Colab';

      default:
        return source;
    }
  }

  sourceSeverity(
    source: string,
  ):
    | 'success'
    | 'info'
    | 'secondary' {
    switch (source) {
      case 'ml_service':
        return 'success';

      case 'google_colab':
        return 'info';

      default:
        return 'secondary';
    }
  }

  runStatusLabel(
    run: MachineLearningRun,
  ): string {
    return run.model.is_active
      ? 'Activo'
      : 'Histórico';
  }

  runStatusSeverity(
    run: MachineLearningRun,
  ):
    | 'success'
    | 'secondary' {
    return run.model.is_active
      ? 'success'
      : 'secondary';
  }

  /*
  |--------------------------------------------------------------------------
  | Carga privada
  |--------------------------------------------------------------------------
  */

  private loadLatest(): void {
    this.loading.set(true);

    this.api
      .latest()
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.activeRun.set(
            response.data,
          );
        },

        error: error => {
          this.showError(
            'No se pudo cargar el pronóstico',
            error,
          );
        },
      });
  }

  private loadHistory(): void {
    this.historyLoading.set(
      true,
    );

    this.api
      .history(
        this.historyPage(),
        this.historyPerPage(),
      )
      .pipe(
        finalize(() => {
          this.historyLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.history.set(
            response.data,
          );

          this.historyTotal.set(
            response.meta.total,
          );
        },

        error: error => {
          this.showError(
            'No se pudo cargar el historial',
            error,
          );
        },
      });
  }

  private loadRemoteModel(): void {
    this.modelLoading.set(true);

    this.api
      .remoteModel()
      .pipe(
        finalize(() => {
          this.modelLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.remoteModel.set(
            response.data,
          );
        },

        error: () => {
          this.remoteModel.set(null);
        },
      });
  }

  private loadRegistry(): void {
    this.registryLoading.set(
      true,
    );

    this.api
      .trainingRegistry()
      .pipe(
        finalize(() => {
          this.registryLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.registry.set(
            response.data,
          );
        },

        error: error => {
          this.showError(
            'No se pudo consultar el registro de modelos',
            error,
          );
        },
      });
  }

  private loadTrainingRuns(): void {
    this.trainingRunsLoading.set(
      true,
    );

    this.api
      .trainingRuns(
        this.trainingPage(),
        this.trainingPerPage(),
      )
      .pipe(
        finalize(() => {
          this.trainingRunsLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.trainingRuns.set(
            response.data,
          );

          this.trainingTotal.set(
            response.meta.total,
          );
        },

        error: error => {
          this.showError(
            'No se pudo cargar el historial de candidatos',
            error,
          );
        },
      });
  }

  private loadInitialTrainingPreview(): void {
    this.api
      .previewTraining({
        limit: 365,
        include_empty_days: true,
      })
      .pipe(
        finalize(() => {
          this.trainingLoading.set(
            false,
          );
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.trainingPreview.set(
            response.data,
          );
        },

        error: error => {
          this.showError(
            'No se pudo consultar la madurez del dataset',
            error,
          );
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Utilidades
  |--------------------------------------------------------------------------
  */

  private showError(
    summary: string,
    error: unknown,
  ): void {
    const responseError =
      error as {
        error?: {
          message?: string;
        };
      };

    this.toast.add({
      severity: 'error',
      summary,
      detail:
        responseError
          ?.error
          ?.message ??
        'Ocurrió un error al consultar el servidor.',
    });
  }

  private startOfToday(): Date {
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

  private tomorrow(): Date {
    const date =
      this.startOfToday();

    date.setDate(
      date.getDate() + 1,
    );

    return date;
  }

  private toApiDate(
    date: Date,
  ): string {
    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1,
      ).padStart(2, '0');

    const day =
      String(
        date.getDate(),
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private parseDate(
    value: string,
  ): Date {
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
    ) {
      const [
        year,
        month,
        day,
      ] = value
        .split('-')
        .map(Number);

      return new Date(
        year,
        month - 1,
        day,
      );
    }

    return new Date(value);
  }

  private shortDayLabel(
    day: string,
  ): string {
    const labels:
      Record<string, string> = {
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

  private sizeColor(
    size: keyof ForecastSizes,
  ): string {
    const colors:
      Record<
        keyof ForecastSizes,
        string
      > = {
        mini:
          this.cssVariable(
            '--p-blue-500',
            '#3b82f6',
          ),

        small:
          this.cssVariable(
            '--p-pink-500',
            '#ec4899',
          ),

        medium:
          this.cssVariable(
            '--p-orange-500',
            '#f97316',
          ),

        family:
          this.cssVariable(
            '--p-yellow-500',
            '#eab308',
          ),

        giant:
          this.cssVariable(
            '--p-teal-500',
            '#14b8a6',
          ),
      };

    return colors[size];
  }

  private cssVariable(
    property: string,
    fallback: string,
  ): string {
    const value =
      getComputedStyle(
        this.document.documentElement,
      )
        .getPropertyValue(
          property,
        )
        .trim();

    return value || fallback;
  }

  private colorWithAlpha(
    color: string,
    alpha: number,
  ): string {
    if (
      color.startsWith('#')
    ) {
      const hex =
        color.replace('#', '');

      const normalized =
        hex.length === 3
          ? hex
              .split('')
              .map(
                character =>
                  character + character,
              )
              .join('')
          : hex;

      const value =
        Number.parseInt(
          normalized,
          16,
        );

      const red =
        (value >> 16) & 255;

      const green =
        (value >> 8) & 255;

      const blue =
        value & 255;

      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    return color;
  }
}
