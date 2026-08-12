import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { CashSession } from '../../../core/api/admin/cash-register/admin-cash-register.models';
import {
  cashDifferenceClass,
  cashSessionStatusLabel,
  cashSessionStatusSeverity,
} from '../../ui/admin-cash-register-ui.utils';

@Component({
  selector: 'app-admin-cash-register-history-table',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    PaginatorModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-cash-register-history-table.html',
  styleUrl: './admin-cash-register-history-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterHistoryTableComponent {
  readonly loading = input.required<boolean>();
  readonly sessions = input.required<CashSession[]>();
  readonly total = input.required<number>();
  readonly first = input.required<number>();
  readonly perPage = input.required<number>();
  readonly visibleFrom = input.required<number>();
  readonly visibleTo = input.required<number>();
  readonly hasFilters = input.required<boolean>();

  readonly pageChange = output<PaginatorState>();
  readonly clearFilters = output<void>();

  statusLabel(status: CashSession['status']): string {
    return cashSessionStatusLabel(status, true);
  }

  readonly statusSeverity = cashSessionStatusSeverity;

  differenceClass(difference: number | null): string {
    return cashDifferenceClass(difference, 'cash-history');
  }
}
