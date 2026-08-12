import {
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

export interface PromotionOrderSummaryItem {
  key: string;

  index: number;

  shortTitle: string;

  summary: string;

  configured: boolean;

  extrasCount: number;

  maxExtras: number;
}

@Component({
  selector:
    'app-promotion-order-summary',

  standalone:
    true,

  imports: [
    CurrencyPipe,
  ],

  templateUrl:
    './promotion-order-summary.html',

  styleUrl:
    './promotion-order-summary.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionOrderSummaryComponent {
  readonly items =
    input.required<
      readonly PromotionOrderSummaryItem[]
    >();

  readonly promotionBasePrice =
    input.required<number>();

  readonly extrasPerUnitTotal =
    input.required<number>();

  readonly quantity =
    input.required<number>();

  readonly total =
    input.required<number>();

  readonly canSubmit =
    input.required<boolean>();

  readonly submitting =
    input.required<boolean>();

  readonly cartUnits =
    input.required<number>();

  readonly progressLabel =
    input.required<string>();

  readonly addToCart =
    output<void>();

  readonly checkout =
    output<void>();

  protected onAddToCart(): void {
    if (
      !this.canSubmit() ||
      this.submitting()
    ) {
      return;
    }

    this.addToCart.emit();
  }

  protected onCheckout(): void {
    if (
      this.cartUnits() <=
      0
    ) {
      return;
    }

    this.checkout.emit();
  }
}
