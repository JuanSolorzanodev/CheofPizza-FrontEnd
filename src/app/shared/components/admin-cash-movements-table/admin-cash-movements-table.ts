import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import {
  CashMovement,
  CashMovementType,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

@Component({
  selector: 'app-admin-cash-movements-table',
  standalone: true,
  imports: [CommonModule, ButtonModule, TableModule, TagModule],
  templateUrl: './admin-cash-movements-table.html',
  styleUrl: './admin-cash-movements-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashMovementsTableComponent {
  readonly movements = input.required<CashMovement[]>();
  readonly movementRequested = output<CashMovementType>();

  movementLabel(type: CashMovementType): string {
    return type === 'income' ? 'Ingreso' : 'Egreso';
  }

  movementSeverity(type: CashMovementType): 'success' | 'danger' {
    return type === 'income' ? 'success' : 'danger';
  }

  movementSign(type: CashMovementType): string {
    return type === 'income' ? '+' : '-';
  }
}
