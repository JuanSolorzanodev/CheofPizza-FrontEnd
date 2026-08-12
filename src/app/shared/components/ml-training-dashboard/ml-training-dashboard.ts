import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { MachineLearningApiService } from '../../../core/api/machine-learning/machine-learning-api.service';
import {
  MachineLearningTrainingRun,
  ModelRegistry,
  ModelRegistryReference,
  TrainingCandidateMetric,
  TrainingDatasetFreshness,
  TrainingDatasetMaturity,
  TrainingPreviewResult,
} from '../../../core/api/machine-learning/machine-learning.models';

@Component({
  selector: 'app-ml-training-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    PaginatorModule,
    ProgressBarModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ml-training-dashboard.html',
  styleUrl: './ml-training-dashboard.scss',
})
export class MlTrainingDashboardComponent implements OnInit {
  private readonly api = inject(MachineLearningApiService);
  private readonly toast = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly modelChanged = output<void>();

  readonly trainingLoading = signal(true);

  readonly registryLoading = signal(true);

  readonly trainingRunsLoading = signal(true);

  readonly previewingTraining = signal(false);

  readonly buildingCandidate = signal(false);

  readonly rollingBack = signal(false);

  readonly activatingRunUuid = signal<string | null>(null);

  readonly trainingDetailLoading = signal(false);

  readonly trainingDetailDialogVisible = signal(false);

  readonly registry = signal<ModelRegistry | null>(null);

  readonly trainingPreview = signal<TrainingPreviewResult | null>(null);

  readonly trainingRuns = signal<MachineLearningTrainingRun[]>([]);

  readonly selectedTrainingRun = signal<MachineLearningTrainingRun | null>(null);

  readonly trainingPage = signal(1);

  readonly trainingPerPage = signal(10);

  readonly trainingTotal = signal(0);

  readonly datasetMaturity = computed<TrainingDatasetMaturity | null>(
    () => this.trainingPreview()?.dataset.maturity ?? null,
  );

  readonly datasetSummary = computed(() => this.trainingPreview()?.dataset.summary ?? null);

  readonly datasetFreshness = computed<TrainingDatasetFreshness | null>(
    () => this.trainingPreview()?.dataset.freshness ?? null,
  );

  readonly activeRegistryModel = computed<ModelRegistryReference | null>(
    () => this.registry()?.active ?? null,
  );

  readonly maturityProgress = computed(() => {
    const maturity = this.datasetMaturity();

    if (!maturity) {
      return 0;
    }

    const target = Math.max(1, maturity.operational_training_days);

    return Math.min(100, Math.round((maturity.active_days / target) * 100));
  });

  readonly experimentalProgress = computed(() => {
    const maturity = this.datasetMaturity();

    if (!maturity) {
      return 0;
    }

    const target = Math.max(1, maturity.minimum_training_days);

    return Math.min(100, Math.round((maturity.active_days / target) * 100));
  });

  readonly canBuildCandidate = computed(
    () => this.datasetMaturity()?.can_train_experimental === true,
  );

  readonly hasTrainingPreview = computed(() => this.trainingPreview()?.preview.trained === true);

  readonly trainingWinner = computed(() => this.trainingPreview()?.preview.winner ?? null);

  readonly trainingCandidates = computed<TrainingCandidateMetric[]>(
    () => this.trainingPreview()?.preview.candidates ?? [],
  );

  readonly rollbackAvailable = computed(() => this.registry()?.rollback_available === true);

  readonly activeHistoricalArtifactId = computed(() => {
    const active = this.activeRegistryModel();

    return active?.kind === 'historical' ? active.artifact_id : null;
  });

  readonly trainingBusy = computed(
    () =>
      this.previewingTraining() ||
      this.buildingCandidate() ||
      this.rollingBack() ||
      this.activatingRunUuid() !== null,
  );

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.trainingLoading.set(true);
    this.loadRegistry();
    this.loadTrainingRuns();
    this.loadInitialTrainingPreview();
  }

  runTrainingPreview(): void {
    if (this.previewingTraining()) {
      return;
    }

    this.previewingTraining.set(true);

    this.api
      .previewTraining({
        limit: 365,
        include_empty_days: true,
      })
      .pipe(
        finalize(() => {
          this.previewingTraining.set(false);

          this.trainingLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.trainingPreview.set(response.data);

          this.toast.add({
            severity: response.data.preview.trained ? 'success' : 'info',

            summary: response.data.preview.trained
              ? 'Evaluación completada'
              : 'Dataset en recopilación',

            detail: response.data.preview.message,
          });
        },

        error: (error) => {
          this.showError('No se pudo evaluar el dataset', error);
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Construcción de candidato
  |--------------------------------------------------------------------------
  */

  confirmBuildCandidate(): void {
    if (!this.canBuildCandidate() || this.buildingCandidate()) {
      return;
    }

    const operational = this.datasetMaturity()?.can_train_operational === true;

    this.confirmation.confirm({
      header: 'Construir candidato',

      icon: operational ? 'pi pi-sparkles' : 'pi pi-exclamation-triangle',

      message: operational
        ? 'Se entrenará un nuevo candidato con ' +
          'los datos disponibles. El modelo activo ' +
          'no cambiará automáticamente.'
        : 'El dataset solo cumple el mínimo experimental. ' +
          'El candidato se construirá, pero deberá ' +
          'revisarse cuidadosamente antes de activarlo.',

      acceptLabel: 'Construir candidato',

      rejectLabel: 'Cancelar',

      acceptButtonStyleClass: 'p-button-success',

      accept: () => {
        this.buildCandidate();
      },
    });
  }

  private buildCandidate(): void {
    this.buildingCandidate.set(true);

    this.api
      .buildTrainingCandidate({
        limit: 365,
        include_empty_days: true,
      })
      .pipe(
        finalize(() => {
          this.buildingCandidate.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.toast.add({
            severity: 'success',
            summary: 'Candidato construido',
            detail: response.message,
          });

          this.trainingPage.set(1);
          this.loadTrainingRuns();
          this.loadRegistry();
        },

        error: (error) => {
          this.showError('No se pudo construir el candidato', error);
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Activación
  |--------------------------------------------------------------------------
  */

  confirmActivateTrainingRun(run: MachineLearningTrainingRun): void {
    if (!this.isRunActivatable(run) || this.activatingRunUuid() !== null) {
      return;
    }

    this.confirmation.confirm({
      header: 'Activar modelo candidato',

      icon: 'pi pi-exclamation-triangle',

      message:
        `Se activará ${
          run.artifact.algorithm_label ?? run.artifact.algorithm ?? 'el candidato seleccionado'
        }. ` +
        'A partir de ese momento los nuevos ' +
        'pronósticos usarán este modelo. ' +
        'El modelo anterior quedará disponible ' +
        'para rollback.',

      acceptLabel: 'Activar modelo',

      rejectLabel: 'Cancelar',

      acceptButtonStyleClass: 'p-button-success',

      accept: () => {
        this.activateTrainingRun(run);
      },
    });
  }

  private activateTrainingRun(run: MachineLearningTrainingRun): void {
    this.activatingRunUuid.set(run.uuid);

    this.api
      .activateTrainingRun(run.uuid)
      .pipe(
        finalize(() => {
          this.activatingRunUuid.set(null);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.toast.add({
            severity: 'success',
            summary: 'Modelo activado',
            detail: response.message,
          });

          this.loadRegistry();
          this.loadTrainingRuns();
          this.modelChanged.emit();
        },

        error: (error) => {
          this.showError('No se pudo activar el modelo', error);
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Rollback
  |--------------------------------------------------------------------------
  */

  confirmRollback(): void {
    if (!this.rollbackAvailable() || this.rollingBack()) {
      return;
    }

    const active = this.activeRegistryModel();

    this.confirmation.confirm({
      header: 'Restaurar modelo anterior',

      icon: 'pi pi-history',

      message:
        `El modelo activo ${active?.version ?? ''} será reemplazado por la versión anterior. ` +
        'Esta operación cambiará el modelo utilizado ' +
        'para los próximos pronósticos.',

      acceptLabel: 'Ejecutar rollback',

      rejectLabel: 'Cancelar',

      acceptButtonStyleClass: 'p-button-danger',

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
          this.rollingBack.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.toast.add({
            severity: 'success',
            summary: 'Modelo restaurado',
            detail: response.message,
          });

          this.loadRegistry();
          this.loadTrainingRuns();
          this.modelChanged.emit();
        },

        error: (error) => {
          this.showError('No se pudo restaurar el modelo', error);
        },
      });
  }

  /*
  |--------------------------------------------------------------------------
  | Detalle de entrenamiento
  |--------------------------------------------------------------------------
  */

  openTrainingRunDetail(run: MachineLearningTrainingRun): void {
    this.selectedTrainingRun.set(null);

    this.trainingDetailLoading.set(true);

    this.trainingDetailDialogVisible.set(true);

    this.api
      .trainingRun(run.uuid)
      .pipe(
        finalize(() => {
          this.trainingDetailLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.selectedTrainingRun.set(response.data);
        },

        error: (error) => {
          this.trainingDetailDialogVisible.set(false);

          this.showError('No se pudo abrir el entrenamiento', error);
        },
      });
  }

  onTrainingDetailVisibleChange(visible: boolean): void {
    this.trainingDetailDialogVisible.set(visible);

    if (!visible) {
      this.selectedTrainingRun.set(null);
    }
  }

  onTrainingPageChange(event: PaginatorState): void {
    this.trainingPage.set((event.page ?? 0) + 1);

    this.trainingPerPage.set(event.rows ?? this.trainingPerPage());

    this.loadTrainingRuns();
  }

  registryKindLabel(kind: string | null | undefined): string {
    switch (kind) {
      case 'legacy':
        return 'Modelo heredado';

      case 'historical':
        return 'Modelo histórico';

      default:
        return kind || 'Sin modelo';
    }
  }

  registryKindSeverity(kind: string | null | undefined): 'success' | 'info' | 'secondary' {
    return kind === 'historical' ? 'success' : kind === 'legacy' ? 'info' : 'secondary';
  }

  maturitySeverity(): 'success' | 'warn' | 'secondary' | 'info' {
    const maturity = this.datasetMaturity();

    if (maturity?.can_train_operational) {
      return 'success';
    }

    if (maturity?.can_train_experimental) {
      return 'warn';
    }

    return maturity ? 'secondary' : 'info';
  }

  freshnessSeverity(): 'success' | 'warn' | 'info' | 'secondary' {
    const status = this.datasetFreshness()?.status;

    switch (status) {
      case 'up_to_date':
        return 'success';

      case 'reevaluate':
        return 'warn';

      case 'collecting':
        return 'info';

      default:
        return 'secondary';
    }
  }

  signedNumber(value: number): string {
    if (value > 0) {
      return `+${value}`;
    }

    return String(value);
  }

  trainingStatusLabel(status: string): string {
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

  trainingStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  algorithmLabel(algorithm: string | null | undefined): string {
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

  isRunActivatable(run: MachineLearningTrainingRun): boolean {
    return (
      (run.status === 'built' || run.status === 'rolled_back') &&
      run.artifact.id !== null &&
      run.artifact.is_active === false
    );
  }

  isRunActive(run: MachineLearningTrainingRun): boolean {
    return run.artifact.is_active || this.activeHistoricalArtifactId() === run.artifact.id;
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

  private loadRegistry(): void {
    this.registryLoading.set(true);

    this.api
      .trainingRegistry()
      .pipe(
        finalize(() => {
          this.registryLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.registry.set(response.data);
        },

        error: (error) => {
          this.showError('No se pudo consultar el registro de modelos', error);
        },
      });
  }

  private loadTrainingRuns(): void {
    this.trainingRunsLoading.set(true);

    this.api
      .trainingRuns(this.trainingPage(), this.trainingPerPage())
      .pipe(
        finalize(() => {
          this.trainingRunsLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.trainingRuns.set(response.data);

          this.trainingTotal.set(response.meta.total);
        },

        error: (error) => {
          this.showError('No se pudo cargar el historial de candidatos', error);
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
          this.trainingLoading.set(false);
        }),

        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.trainingPreview.set(response.data);
        },

        error: (error) => {
          this.showError('No se pudo consultar la madurez del dataset', error);
        },
      });
  }

  private showError(summary: string, error: unknown): void {
    const responseError = error as { error?: { message?: string } };

    this.toast.add({
      severity: 'error',
      summary,
      detail: responseError?.error?.message ?? 'Ocurrió un error al consultar el servidor.',
    });
  }

  private parseDate(value: string): Date {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(value);
  }
}
