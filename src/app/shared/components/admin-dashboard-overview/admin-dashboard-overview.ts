import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';

import {
  AdminDashboardAnalyticsBundle,
  AdminSalesComparison,
  AdminSalesSummary,
} from '../../../core/api/admin/analytics/admin-sales-analytics.models';

type ComparisonTone = 'positive' | 'negative' | 'neutral';

@Component({
  selector: 'app-admin-dashboard-overview',
  standalone: true,
  imports: [CurrencyPipe, DecimalPipe, RouterLink, SkeletonModule],
  templateUrl: './admin-dashboard-overview.html',
  styleUrl: './admin-dashboard-overview.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardOverviewComponent {
  readonly loading = input(false);

  readonly summary = input<AdminSalesSummary | null>(null);

  readonly comparison = input<AdminSalesComparison | null>(null);

  readonly data = input<AdminDashboardAnalyticsBundle | null>(null);

  readonly hasFinancialAlerts = computed(() => {
    const payments = this.data()?.payments;

    if (!payments) {
      return false;
    }

    return (
      payments.pending.transactions > 0 ||
      payments.refunds.refunded_payments > 0 ||
      payments.refunds.partially_refunded_payments > 0
    );
  });

  comparisonLabel(value: number | null): string {
    if (value === null) {
      return 'Sin referencia';
    }

    if (value === 0) {
      return 'Sin variación';
    }

    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  }

  comparisonTone(value: number | null): ComparisonTone {
    if (value === null || value === 0) {
      return 'neutral';
    }

    return value > 0 ? 'positive' : 'negative';
  }

  comparisonIcon(value: number | null): string {
    if (value === null || value === 0) {
      return 'pi pi-minus';
    }

    return value > 0 ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right';
  }
}
