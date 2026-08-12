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
  selector: 'app-operator-order-mobile-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, TagModule],
  templateUrl: './operator-order-mobile-card.html',
  styleUrl: './operator-order-mobile-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorOrderMobileCard {
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
  readonly cardClass = () => operatorOrderClass(this.order(), 'mobile-order');
}
