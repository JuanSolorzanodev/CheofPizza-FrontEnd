import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { OperatorOrderListDto } from '../../../core/api/operator/operator-orders.models';
import {
  formatOperatorDate,
  operatorStatusSeverity,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../../ui/operator-order-ui.utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector -- Attribute selector preserves valid table semantics.
  selector: 'tbody[appAdminOrdersTableBody]',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, TagModule, TooltipModule],
  templateUrl: './admin-orders-table-body.html',
  styleUrl: './admin-orders-table-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersTableBodyComponent {
  readonly orders = input.required<readonly OperatorOrderListDto[]>();

  readonly formatDate = formatOperatorDate;
  readonly prettyDeliveryType = prettyDeliveryType;
  readonly prettyPaymentMethod = prettyPaymentMethod;
  readonly prettyStatus = prettyOperatorStatus;
  readonly statusSeverity = operatorStatusSeverity;

  customerInitial(order: OperatorOrderListDto): string {
    return (order.customer?.name?.trim() || 'C').slice(0, 1).toUpperCase();
  }

  deliveryIcon(order: OperatorOrderListDto): string {
    return order.delivery_type === 'delivery' ? 'pi pi-truck' : 'pi pi-shop';
  }
}
