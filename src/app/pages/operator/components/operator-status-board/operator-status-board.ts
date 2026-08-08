import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  OrderStatusName,
  QueueCountsDto,
} from '../../../../core/api/operator/operator-orders.models';

interface StatusBoardItem {
  key: OrderStatusName;
  label: string;
  icon: string;
  count: number;
  active: boolean;
  historical: boolean;
}

@Component({
  selector: 'app-operator-status-board',
  standalone: true,
  imports: [
    SkeletonModule,
  ],
  templateUrl: './operator-status-board.html',
  styleUrl: './operator-status-board.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class OperatorStatusBoard {
  readonly queue =
    input.required<QueueCountsDto>();

  readonly selectedStatus =
    input<string | null>(null);

  readonly loading =
    input(false);

  readonly error =
    input<string | null>(null);

  readonly statusSelected =
    output<OrderStatusName>();

  readonly clearRequested =
    output<void>();

  readonly retryRequested =
    output<void>();

  readonly skeletonRows =
    Array.from({
      length: 5,
    });

  private readonly statusOrder:
    readonly OrderStatusName[] = [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'on_the_way',
      'delivered',
      'cancelled',
    ];

  readonly statusItems =
    computed<StatusBoardItem[]>(
      () => {
        const counts =
          this.queue();

        const selected =
          this.selectedStatus();

        return this.statusOrder.map(
          (statusName) => ({
            key:
              statusName,

            label:
              this.statusLabel(
                statusName,
              ),

            icon:
              this.statusIcon(
                statusName,
              ),

            count:
              Number(
                counts[
                  statusName
                ] ?? 0,
              ),

            active:
              selected ===
              statusName,

            historical:
              statusName ===
                'delivered' ||
              statusName ===
                'cancelled',
          }),
        );
      },
    );

  readonly activeItems =
    computed(() =>
      this.statusItems().filter(
        (item) =>
          !item.historical,
      ),
    );

  readonly historicalItems =
    computed(() =>
      this.statusItems().filter(
        (item) =>
          item.historical,
      ),
    );

  select(
    statusName: OrderStatusName,
  ): void {
    this.statusSelected.emit(
      statusName,
    );
  }

  clear(): void {
    this.clearRequested.emit();
  }

  retry(): void {
    this.retryRequested.emit();
  }

  itemClass(
    item: StatusBoardItem,
  ): string {
    return [
      'status-filter',

      `status-filter--${item.key}`,

      item.active
        ? 'status-filter--active'
        : '',

      item.historical
        ? 'status-filter--historical'
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private statusLabel(
    statusName: OrderStatusName,
  ): string {
    const labels:
      Record<
        OrderStatusName,
        string
      > = {
      pending:
        'Pendientes',

      confirmed:
        'Confirmados',

      preparing:
        'En cocina',

      ready:
        'Listos',

      on_the_way:
        'En camino',

      delivered:
        'Entregados',

      cancelled:
        'Cancelados',
    };

    return labels[
      statusName
    ];
  }

  private statusIcon(
    statusName: OrderStatusName,
  ): string {
    const icons:
      Record<
        OrderStatusName,
        string
      > = {
      pending:
        'pi pi-bell',

      confirmed:
        'pi pi-check',

      preparing:
        'pi pi-hourglass',

      ready:
        'pi pi-check-circle',

      on_the_way:
        'pi pi-truck',

      delivered:
        'pi pi-verified',

      cancelled:
        'pi pi-times-circle',
    };

    return icons[
      statusName
    ];
  }
}
