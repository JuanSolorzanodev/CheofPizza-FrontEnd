import { CurrencyPipe } from '@angular/common';

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FormsModule } from '@angular/forms';

import { CheckboxModule } from 'primeng/checkbox';

import { ChipModule } from 'primeng/chip';

export interface PromotionCustomizerBaseIngredient {
  id: number;
  name: string;
  removable: boolean;
}

export interface PromotionCustomizerRemovedIngredient {
  id: number;
  name: string;
}

export interface PromotionCustomizerSelectedExtra {
  id: number;
  name: string;
  priceLabel: string;
}

export interface PromotionCustomizerExtraOption {
  id: number;
  name: string;

  priceLabel: string;

  selected: boolean;
  disabled: boolean;

  disabledReason: string | null;
}

export interface PromotionPizzaCustomizationItem {
  slotKey: string;

  shortTitle: string;
  summary: string;

  pizzaName: string;
  imageUrl: string | null;

  sizeName: string | null;

  extrasCount: number;
  maxExtras: number;

  extrasTotal: number;

  visibleBaseIngredients: readonly PromotionCustomizerBaseIngredient[];

  removedBaseIngredients: readonly PromotionCustomizerRemovedIngredient[];

  selectedExtras: readonly PromotionCustomizerSelectedExtra[];

  extraOptions: readonly PromotionCustomizerExtraOption[];
}

export interface PromotionCustomizerIngredientEvent {
  slotKey: string;
  ingredientId: number;
}

export interface PromotionCustomizerExtraToggleEvent extends PromotionCustomizerIngredientEvent {
  checked: boolean;
}

@Component({
  selector: 'app-promotion-pizza-customizer',

  standalone: true,

  imports: [FormsModule, CurrencyPipe, CheckboxModule, ChipModule],

  templateUrl: './promotion-pizza-customizer.html',

  styleUrl: './promotion-pizza-customizer.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionPizzaCustomizerComponent {
  readonly items = input.required<readonly PromotionPizzaCustomizationItem[]>();

  readonly activeSlotKey = input<string | null>(null);

  readonly stepNumber = input(1);

  readonly activate = output<string>();

  readonly resetRequested = output<string>();

  readonly removeBaseIngredient = output<PromotionCustomizerIngredientEvent>();

  readonly restoreBaseIngredient = output<PromotionCustomizerIngredientEvent>();

  readonly toggleExtra = output<PromotionCustomizerExtraToggleEvent>();

  readonly removeExtra = output<PromotionCustomizerIngredientEvent>();

  protected isActive(item: PromotionPizzaCustomizationItem): boolean {
    return this.activeSlotKey() === item.slotKey;
  }

  protected onActivate(slotKey: string): void {
    this.activate.emit(slotKey);
  }

  protected onReset(slotKey: string): void {
    this.resetRequested.emit(slotKey);
  }

  protected onRemoveBaseIngredient(slotKey: string, ingredientId: number): void {
    this.removeBaseIngredient.emit({
      slotKey,
      ingredientId,
    });
  }

  protected onRestoreBaseIngredient(slotKey: string, ingredientId: number): void {
    this.restoreBaseIngredient.emit({
      slotKey,
      ingredientId,
    });
  }

  protected onToggleExtra(
    slotKey: string,
    ingredientId: number,
    checked: boolean | null | undefined,
  ): void {
    this.toggleExtra.emit({
      slotKey,
      ingredientId,
      checked: Boolean(checked),
    });
  }

  protected onRemoveExtra(slotKey: string, ingredientId: number): void {
    this.removeExtra.emit({
      slotKey,
      ingredientId,
    });
  }
}
