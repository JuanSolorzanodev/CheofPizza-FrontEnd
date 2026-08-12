import {
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  SelectModule,
} from 'primeng/select';

import {
  PromotionSizePriceDto,
} from '../../../core/api/promotions/promotion.models';

export interface PromotionSizeOption {
  label: string;
  value: number;
}

@Component({
  selector:
    'app-promotion-size-selector',

  standalone:
    true,

  imports: [
    FormsModule,
    CurrencyPipe,
    SelectModule,
  ],

  templateUrl:
    './promotion-size-selector.html',

  styleUrl:
    './promotion-size-selector.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionSizeSelectorComponent {
  readonly options =
    input.required<
      PromotionSizeOption[]
    >();

  readonly selectedSizeId =
    input<
      number |
      null
    >(null);

  readonly selectedSizePrice =
    input<
      PromotionSizePriceDto |
      null
    >(null);

  readonly stepNumber =
    input(1);

  readonly sizeChange =
    output<
      number |
      null
    >();

  protected onSizeChange(
    value:
      number |
      null |
      undefined,
  ): void {
    const normalized =
      Number(
        value ?? 0,
      );

    this.sizeChange.emit(
      normalized > 0
        ? normalized
        : null,
    );
  }
}
