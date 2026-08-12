import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import { MachineLearningComparisonComponent } from '../machine-learning-comparison/machine-learning-comparison';
import { MlForecastDashboardComponent } from '../../../shared/components/ml-forecast-dashboard/ml-forecast-dashboard';
import { MlTrainingDashboardComponent } from '../../../shared/components/ml-training-dashboard/ml-training-dashboard';

type DashboardSection = 'forecast' | 'comparison' | 'training';

@Component({
  selector: 'app-machine-learning-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    SkeletonModule,
    MachineLearningComparisonComponent,
    MlForecastDashboardComponent,
    MlTrainingDashboardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machine-learning-dashboard.html',
  styleUrl: './machine-learning-dashboard.scss',
})
export class MachineLearningDashboard {
  private readonly forecastDashboard = viewChild(MlForecastDashboardComponent);
  private readonly trainingDashboard = viewChild(MlTrainingDashboardComponent);

  readonly activeSection = signal<DashboardSection>('forecast');
  readonly comparisonRefreshKey = signal(0);

  readonly activeLoading = computed(() => {
    if (this.activeSection() === 'forecast') {
      return this.forecastDashboard()?.loading() ?? false;
    }

    if (this.activeSection() === 'training') {
      return this.trainingDashboard()?.trainingLoading() ?? false;
    }

    return false;
  });

  selectSection(section: DashboardSection): void {
    this.activeSection.set(section);
  }

  refreshActiveSection(): void {
    if (this.activeSection() === 'forecast') {
      this.forecastDashboard()?.refresh();
      return;
    }

    if (this.activeSection() === 'comparison') {
      this.comparisonRefreshKey.update((value) => value + 1);
      return;
    }

    this.trainingDashboard()?.refresh();
  }

  openGenerateDialog(): void {
    this.forecastDashboard()?.openGenerateDialog();
  }

  onModelChanged(): void {
    this.forecastDashboard()?.refresh();
  }
}
