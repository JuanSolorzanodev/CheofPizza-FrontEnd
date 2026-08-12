import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  CashSessionDetail,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';
import {
  cashDifferenceClass,
  cashDifferenceLabel,
  cashMovementLabel,
  cashMovementSeverity,
  cashMovementSign,
  cashSessionStatusLabel,
  cashSessionStatusSeverity,
} from '../../ui/admin-cash-register-ui.utils';

@Component({
  selector: 'app-admin-cash-register-detail-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-cash-register-detail-view.html',
  styleUrl: './admin-cash-register-detail-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterDetailViewComponent {
  readonly detail = input.required<CashSessionDetail>();

  readonly statusLabel = cashSessionStatusLabel;
  readonly statusSeverity = cashSessionStatusSeverity;
  readonly movementLabel = cashMovementLabel;
  readonly movementSeverity = cashMovementSeverity;
  readonly movementSign = cashMovementSign;
  readonly differenceLabel = cashDifferenceLabel;

  differenceClass(difference: number | null): string {
    return cashDifferenceClass(difference, 'cash-detail');
  }
}
