import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TagModule } from 'primeng/tag';

import {
  MachineLearningComparison,
  MachineLearningComparisonDay,
} from '../../../core/api/machine-learning/machine-learning.models';
import {
  mlAccuracyClass,
  mlDifferenceClass,
  mlFormatCurrency,
  mlFormatDate,
  mlFormatNumber,
  mlFormatPercentage,
  mlFormatSignedNumber,
} from '../../ui/ml-comparison-ui.utils';

@Component({
  selector: 'app-ml-comparison-overview',
  standalone: true,
  imports: [TagModule],
  templateUrl: './ml-comparison-overview.html',
  styleUrl: './ml-comparison-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MlComparisonOverviewComponent {
  readonly comparison = input.required<MachineLearningComparison>();

  readonly completedDays = computed(() =>
    this.comparison().days.filter((day) => day.status === 'completed'),
  );

  readonly bestDay = computed<MachineLearningComparisonDay | null>(() => {
    const completed = this.completedDays().filter((day) => day.accuracy_percentage !== null);

    if (completed.length === 0) {
      return null;
    }

    return completed.reduce((best, current) =>
      (current.accuracy_percentage ?? 0) > (best.accuracy_percentage ?? 0) ? current : best,
    );
  });

  readonly worstDay = computed<MachineLearningComparisonDay | null>(() => {
    const completed = this.completedDays().filter((day) => day.accuracy_percentage !== null);

    if (completed.length === 0) {
      return null;
    }

    return completed.reduce((worst, current) =>
      (current.accuracy_percentage ?? 0) < (worst.accuracy_percentage ?? 0) ? current : worst,
    );
  });

  readonly totalNetSales = computed(() =>
    this.comparison().days.reduce((total, day) => total + (day.actual_net_sales ?? 0), 0),
  );

  readonly totalDeliveredOrders = computed(() =>
    this.comparison().days.reduce((total, day) => total + (day.delivered_orders ?? 0), 0),
  );

  readonly accuracyClass = mlAccuracyClass;
  readonly differenceClass = mlDifferenceClass;
  readonly formatCurrency = mlFormatCurrency;
  readonly formatDate = mlFormatDate;
  readonly formatNumber = mlFormatNumber;
  readonly formatPercentage = mlFormatPercentage;
  readonly formatSignedNumber = mlFormatSignedNumber;
}
