import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { OperatorOrderListDto } from '../../../core/api/operator/operator-orders.models';
import {
  formatOperatorDate,
  isOperatorTransfer,
  operatorCustomerName,
  operatorCustomerPhone,
  operatorDeliveryIcon,
  operatorOrderClass,
  operatorPaymentIcon,
  operatorStatusIcon,
  operatorStatusOperationalLabel,
  operatorStatusSeverity,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../../ui/operator-order-ui.utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- Attribute selector preserves valid table semantics.
  selector: 'tr[appOperatorOrderTableRow]',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, TagModule],
  templateUrl: './operator-order-table-row.html',
  styleUrl: './operator-order-table-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'rowClass()' },
})
export class OperatorOrderTableRow {
  readonly order = input.required<OperatorOrderListDto>();
  readonly prettyStatus = prettyOperatorStatus;
  readonly prettyDeliveryType = prettyDeliveryType;
  readonly prettyPaymentMethod = prettyPaymentMethod;
  readonly formatDate = formatOperatorDate;
  readonly statusSeverity = operatorStatusSeverity;
  readonly statusIcon = operatorStatusIcon;
  readonly statusOperationalLabel = operatorStatusOperationalLabel;
  readonly customerName = operatorCustomerName;
  readonly customerPhone = operatorCustomerPhone;
  readonly isTransfer = isOperatorTransfer;
  readonly deliveryIcon = operatorDeliveryIcon;
  readonly paymentIcon = operatorPaymentIcon;

  rowClass(): string {
    return operatorOrderClass(this.order(), 'order-row');
  }
}
