import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TagModule } from 'primeng/tag';
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
  selector: 'app-admin-payment-transaction-mobile-card',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, TagModule],
  templateUrl: './admin-payment-transaction-mobile-card.html',
  styleUrl: './admin-payment-transaction-mobile-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentTransactionMobileCardComponent {
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
