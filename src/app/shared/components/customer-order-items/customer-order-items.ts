import {
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import {
  OrderDto,
  OrderItemDto,
  OrderPersonalizationDto,
} from '../../../core/api/orders/checkout.models';

@Component({
  selector:
    'app-customer-order-items',

  standalone:
    true,

  imports: [
    CurrencyPipe,
  ],

  templateUrl:
    './customer-order-items.html',

  styleUrl:
    './customer-order-items.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CustomerOrderItemsComponent {
  readonly order =
    input.required<OrderDto>();

  readonly totalItems =
    computed(
      () => {
        const order =
          this.order();

        if (
          typeof order
            .items_count ===
          'number'
        ) {
          return order.items_count;
        }

        return (
          order.items ??
          []
        ).reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.quantity ??
                0,
            ),

          0,
        );
      },
    );

  itemName(
    item:
      OrderItemDto,
  ): string {
    if (
      item.item_type ===
      'promotion'
    ) {
      return (
        item.promotion
          ?.name
          ?.trim() ||
        'Promoción'
      );
    }

    if (
      item.is_half_and_half
    ) {
      return (
        `${item.pizza?.name ?? 'Pizza'} / ` +
        `${item.pizza_second?.name ?? 'Pizza'}`
      );
    }

    return (
      item.pizza
        ?.name
        ?.trim() ||
      'Pizza'
    );
  }

  selectedPizzaNames(
    item:
      OrderItemDto,
  ): string[] {
    return (
      item.selected_pizzas ??
      []
    )
      .map(
        (
          selected,
        ) =>
          selected.name ??
          selected.pizza_name ??
          '',
      )
      .map(
        (
          name,
        ) =>
          name.trim(),
      )
      .filter(
        Boolean,
      );
  }

  personalizationLabel(
    personalization:
      OrderPersonalizationDto,
  ): string {
    const action =
      personalization
        .action
        ?.trim();

    const ingredient =
      personalization
        .ingredient_name
        ?.trim();

    if (
      action &&
      ingredient
    ) {
      return `${action}: ${ingredient}`;
    }

    return (
      ingredient ||
      action ||
      'Personalización'
    );
  }

  personalizationTarget(
    personalization:
      OrderPersonalizationDto,
  ): string | null {
    const appliesTo =
      personalization
        .applies_to
        ?.trim();

    if (!appliesTo) {
      return null;
    }

    const labels:
      Record<
        string,
        string
      > = {
      first:
        'Primera mitad',

      second:
        'Segunda mitad',

      whole:
        'Pizza completa',

      promotion_item:
        'Pizza de promoción',
    };

    return (
      labels[
        this.normalize(
          appliesTo,
        )
      ] ??
      appliesTo
    );
  }

  private normalize(
    value:
      string |
      null |
      undefined,
  ): string {
    return (
      value ??
      ''
    )
      .trim()
      .toLowerCase();
  }
}
