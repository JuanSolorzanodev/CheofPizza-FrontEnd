import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

import {
  OperatorStatusChangeDto,
} from '../../../core/api/operator/operator-orders.models';

import {
  formatOperatorDate,
  prettyOperatorStatus,
} from '../../ui/operator-order-ui.utils';

@Component({
  selector: 'app-operator-order-history',
  standalone: true,
  templateUrl: './operator-order-history.html',
  styleUrl: './operator-order-history.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class OperatorOrderHistory {
  readonly changes =
    input.required<
      readonly OperatorStatusChangeDto[]
    >();

  prettyStatus(
    status: string | null | undefined,
  ): string {
    return prettyOperatorStatus(
      status,
    );
  }

  formatDate(
    value: string | null | undefined,
  ): string {
    return formatOperatorDate(
      value,
    );
  }
}
