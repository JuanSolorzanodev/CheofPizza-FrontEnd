import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
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
import { finalize } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { SkeletonModule } from 'primeng/skeleton';

import {
  MachineLearningApiService,
} from '../../../core/api/machine-learning/machine-learning-api.service';
import {
  MachineLearningComparison,
} from '../../../core/api/machine-learning/machine-learning.models';
import {
  MlComparisonChartComponent,
} from '../../../shared/components/ml-comparison-chart/ml-comparison-chart';
import {
  MlComparisonOverviewComponent,
} from '../../../shared/components/ml-comparison-overview/ml-comparison-overview';
import {
  MlComparisonResultsComponent,
} from '../../../shared/components/ml-comparison-results/ml-comparison-results';

@Component({
  selector: 'app-machine-learning-comparison',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DatePickerModule,
    SkeletonModule,
    MlComparisonChartComponent,
    MlComparisonOverviewComponent,
    MlComparisonResultsComponent,
  ],
  templateUrl: './machine-learning-comparison.html',
  styleUrl: './machine-learning-comparison.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MachineLearningComparisonComponent
  implements OnInit
{
  readonly refreshKey = input(0);

  private previousRefreshKey = 0;
  private readonly api = inject(MachineLearningApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly comparison = signal<MachineLearningComparison | null>(null);

  readonly todayDate = this.today();
  readonly minimumDate = this.daysAgo(30);

  readonly filterForm = this.formBuilder.nonNullable.group({
    dateFrom: [this.daysAgo(30), [Validators.required]],
    dateTo: [this.today(), [Validators.required]],
  });

  constructor() {
    effect(() => {
      const refreshKey = this.refreshKey();

      if (
        refreshKey <= 0 ||
        refreshKey === this.previousRefreshKey
      ) {
        return;
      }

      this.previousRefreshKey = refreshKey;
      this.loadComparison();
    });
  }

  ngOnInit(): void {
    this.loadComparison();
  }

  loadComparison(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      this.showWarning(
        'Selecciona una fecha inicial y una fecha final.',
      );
      return;
    }

    const value = this.filterForm.getRawValue();
    const dateFrom = this.normalizeDate(value.dateFrom);
    const dateTo = this.normalizeDate(value.dateTo);

    if (dateFrom.getTime() > dateTo.getTime()) {
      this.showWarning(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    if (this.daysBetween(dateFrom, dateTo) > 30) {
      this.showWarning(
        'El periodo de comparación no puede superar los 31 días.',
      );
      return;
    }

    this.loading.set(true);

    this.api
      .comparison({
        date_from: this.toApiDate(dateFrom),
        date_to: this.toApiDate(dateTo),
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.comparison.set(response.data);
        },
        error: error => {
          this.comparison.set(null);
          this.toast.add({
            severity: 'error',
            summary: 'No se pudo cargar la comparación',
            detail:
              error?.error?.message ??
              'Ocurrió un error al consultar las ventas y las predicciones.',
            life: 5000,
          });
        },
      });
  }

  resetRange(): void {
    this.filterForm.setValue({
      dateFrom: this.daysAgo(30),
      dateTo: this.today(),
    });

    this.loadComparison();
  }

  private today(): Date {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private daysAgo(days: number): Date {
    const date = this.today();
    date.setDate(date.getDate() - days);
    return date;
  }

  private normalizeDate(value: Date): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private daysBetween(from: Date, to: Date): number {
    const dayMilliseconds = 86_400_000;
    const fromTimestamp = Date.UTC(
      from.getFullYear(),
      from.getMonth(),
      from.getDate(),
    );
    const toTimestamp = Date.UTC(
      to.getFullYear(),
      to.getMonth(),
      to.getDate(),
    );

    return Math.round(
      (toTimestamp - fromTimestamp) / dayMilliseconds,
    );
  }

  private toApiDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private showWarning(detail: string): void {
    this.toast.add({
      severity: 'warn',
      summary: 'Revisa el periodo',
      detail,
      life: 4500,
    });
  }
}
