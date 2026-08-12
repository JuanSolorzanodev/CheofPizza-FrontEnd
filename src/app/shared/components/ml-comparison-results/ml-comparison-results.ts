import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { TagModule } from 'primeng/tag';

import { MachineLearningComparison } from '../../../core/api/machine-learning/machine-learning.models';
import {
  mlAccuracyClass,
  mlAccuracyDescription,
  mlComparisonStatusIcon,
  mlComparisonStatusLabel,
  mlComparisonStatusSeverity,
  mlDifferenceClass,
  mlDifferenceLabel,
  mlFormatCurrency,
  mlFormatDate,
  mlFormatNumber,
  mlFormatPercentage,
  mlFormatSignedNumber,
  mlSizeComparison,
} from '../../ui/ml-comparison-ui.utils';

@Component({
  selector: 'app-ml-comparison-results',
  standalone: true,
  imports: [TagModule],
  templateUrl: './ml-comparison-results.html',
  styleUrl: './ml-comparison-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MlComparisonResultsComponent {
  readonly comparison = input.required<MachineLearningComparison>();

  readonly expandedDate = signal<string | null>(null);

  readonly accuracyClass = mlAccuracyClass;
  readonly accuracyDescription = mlAccuracyDescription;
  readonly differenceClass = mlDifferenceClass;
  readonly differenceLabel = mlDifferenceLabel;
  readonly formatCurrency = mlFormatCurrency;
  readonly formatDate = mlFormatDate;
  readonly formatNumber = mlFormatNumber;
  readonly formatPercentage = mlFormatPercentage;
  readonly formatSignedNumber = mlFormatSignedNumber;
  readonly sizeComparison = mlSizeComparison;
  readonly statusIcon = mlComparisonStatusIcon;
  readonly statusLabel = mlComparisonStatusLabel;
  readonly statusSeverity = mlComparisonStatusSeverity;

  toggleDay(date: string): void {
    this.expandedDate.set(this.expandedDate() === date ? null : date);
  }

  isExpanded(date: string): boolean {
    return this.expandedDate() === date;
  }
}
