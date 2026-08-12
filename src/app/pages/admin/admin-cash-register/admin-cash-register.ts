import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';

import {
  CashMovementType,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  StoreCashMovementPayload,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';
import { AdminCashRegisterStore } from '../../../core/api/admin/cash-register/admin-cash-register.store';
import { AdminCashMovementsTableComponent } from '../../../shared/components/admin-cash-movements-table/admin-cash-movements-table';
import { AdminCashRegisterActionsDialogsComponent } from '../../../shared/components/admin-cash-register-actions-dialogs/admin-cash-register-actions-dialogs';
import { AdminCashRegisterSummaryComponent } from '../../../shared/components/admin-cash-register-summary/admin-cash-register-summary';

@Component({
  selector: 'app-admin-cash-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ButtonModule,
    SkeletonModule,
    AdminCashRegisterSummaryComponent,
    AdminCashMovementsTableComponent,
    AdminCashRegisterActionsDialogsComponent,
  ],
  providers: [AdminCashRegisterStore],
  templateUrl: './admin-cash-register.html',
  styleUrl: './admin-cash-register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegister {
  readonly store = inject(AdminCashRegisterStore);

  readonly openDialogVisible = signal(false);
  readonly movementDialogVisible = signal(false);
  readonly closeDialogVisible = signal(false);
  readonly selectedMovementType = signal<CashMovementType>('income');

  readonly expectedCash = computed(
    () => this.store.summary()?.amounts.expected_cash ?? 0,
  );

  constructor() {
    this.store.load();
  }

  refresh(): void {
    this.store.load(true);
  }

  showOpenDialog(): void {
    this.store.clearErrors();
    this.openDialogVisible.set(true);
  }

  showMovementDialog(type: CashMovementType): void {
    this.store.clearErrors();
    this.selectedMovementType.set(type);
    this.movementDialogVisible.set(true);
  }

  showCloseDialog(): void {
    this.store.clearErrors();
    this.closeDialogVisible.set(true);
  }

  submitOpen(payload: OpenCashSessionPayload): void {
    this.store.open(payload, () => this.openDialogVisible.set(false));
  }

  submitMovement(payload: StoreCashMovementPayload): void {
    this.store.addMovement(payload, () => this.movementDialogVisible.set(false));
  }

  submitClose(payload: CloseCashSessionPayload): void {
    this.store.close(payload, () => this.closeDialogVisible.set(false));
  }
}
