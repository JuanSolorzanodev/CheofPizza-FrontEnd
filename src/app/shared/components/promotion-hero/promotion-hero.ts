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
  PromotionDto,
  PromotionSizePriceDto,
} from '../../../core/api/promotions/promotion.models';

@Component({
  selector:
    'app-promotion-hero',

  standalone: true,

  imports: [
    CurrencyPipe,
  ],

  templateUrl:
    './promotion-hero.html',

  styleUrl:
    './promotion-hero.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionHeroComponent {
  readonly promotion =
    input.required<PromotionDto>();

  readonly isSizeFixedPrice =
    input.required<boolean>();

  readonly selectedSizePrice =
    input<
      PromotionSizePriceDto |
      null
    >(null);

  readonly selectedSizeName =
    input<
      string |
      null
    >(null);

  readonly totalSlots =
    input(0);

  readonly configuredSlots =
    input(0);

  readonly maxExtrasPerPizza =
    input(4);

  readonly displayedPrice =
    computed(() => {
      const promotion =
        this.promotion();

      if (
        this.isSizeFixedPrice()
      ) {
        return Number(
          this.selectedSizePrice()
            ?.price ??
          promotion
            .size_prices?.[0]
            ?.price ??
          0,
        );
      }

      return Number(
        promotion.price ?? 0,
      );
    });

  readonly progressPercentage =
    computed(() => {
      const total =
        this.totalSlots();

      if (total <= 0) {
        return 0;
      }

      return Math.min(
        100,
        Math.max(
          0,
          (
            this.configuredSlots() /
            total
          ) * 100,
        ),
      );
    });

  readonly pizzaLabel =
    computed(() =>
      this.totalSlots() === 1
        ? 'pizza'
        : 'pizzas',
    );
}
