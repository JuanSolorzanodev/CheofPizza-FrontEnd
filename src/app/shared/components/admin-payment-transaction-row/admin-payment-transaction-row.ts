import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AdminPaymentTransaction } from '../../../core/api/admin/payment-transactions/admin-payment-transactions.models';
import {
  adminPaymentCustomerContact,
  adminPaymentMethodClass,
  adminPaymentMethodIcon,
  adminPaymentMethodLabel,
  adminPaymentStatusIcon,
  adminPaymentStatusLabel,
  adminPaymentStatusSeverity,
  adminPaymentTransactionSourceLabel,
} from '../../ui/admin-payment-transaction-ui.utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- Attribute selector preserves valid table semantics.
  selector: 'tr[appAdminPaymentTransactionRow]',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TagModule, TooltipModule],
  templateUrl: './admin-payment-transaction-row.html',
  styleUrl: './admin-payment-transaction-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'admin-payment-transaction-row' },
})
export class AdminPaymentTransactionRowComponent {
  readonly transaction = input.required<AdminPaymentTransaction>();
  readonly view = output<AdminPaymentTransaction>();

  readonly methodLabel = adminPaymentMethodLabel;
  readonly methodIcon = adminPaymentMethodIcon;
  readonly methodClass = adminPaymentMethodClass;
  readonly sourceLabel = adminPaymentTransactionSourceLabel;
  readonly statusLabel = adminPaymentStatusLabel;
  readonly statusSeverity = adminPaymentStatusSeverity;
  readonly statusIcon = adminPaymentStatusIcon;
  readonly customerContact = adminPaymentCustomerContact;
}
