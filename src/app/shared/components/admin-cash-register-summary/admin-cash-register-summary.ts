import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';

import {
  CashMovementType,
  CashSession,
  CashSessionSummary,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

@Component({
  selector: 'app-admin-cash-register-summary',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './admin-cash-register-summary.html',
  styleUrl: './admin-cash-register-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterSummaryComponent {
  readonly session = input.required<CashSession>();
  readonly summary = input.required<CashSessionSummary>();

  readonly movementRequested = output<CashMovementType>();
  readonly closeRequested = output<void>();
}
