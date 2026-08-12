import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';

import { SkeletonModule } from 'primeng/skeleton';

import {
  PromotionHeroComponent,
} from '../../../shared/components/promotion-hero/promotion-hero';

import {
  PromotionSizeSelectorComponent,
} from '../../../shared/components/promotion-size-selector/promotion-size-selector';

import {
  PromotionPizzaSelectionChange,
  PromotionPizzaSelectorComponent,
} from '../../../shared/components/promotion-pizza-selector/promotion-pizza-selector';

import {
  PromotionCustomizerExtraToggleEvent,
  PromotionCustomizerIngredientEvent,
  PromotionPizzaCustomizerComponent,
} from '../../../shared/components/promotion-pizza-customizer/promotion-pizza-customizer';

import {
  PromotionOrderSummaryComponent,
} from '../../../shared/components/promotion-order-summary/promotion-order-summary';

import {
  PromotionDetailPageFacade,
} from './promotion-detail-page.facade';

@Component({
  selector:
    'app-promotion-detail-page',

  standalone:
    true,

  imports: [
    SkeletonModule,

    PromotionHeroComponent,
    PromotionSizeSelectorComponent,
    PromotionPizzaSelectorComponent,
    PromotionPizzaCustomizerComponent,
    PromotionOrderSummaryComponent,
  ],

  providers: [
    PromotionDetailPageFacade,
  ],

  templateUrl:
    './promotion-detail-page.html',

  styleUrl:
    './promotion-detail-page.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionDetailPage {
  private readonly facade =
    inject(
      PromotionDetailPageFacade,
    );

  /* =========================================================
     PUBLIC STATE
     ========================================================= */

  readonly maxExtrasPerPizza =
    this.facade.maxExtrasPerPizza;

  readonly cart =
    this.facade.cart;

  readonly loading =
    this.facade.loading;

  readonly submitting =
    this.facade.submitting;

  readonly error =
    this.facade.error;

  readonly promotion =
    this.facade.promotion;

  readonly sencillas =
    this.facade.sencillas;

  readonly especiales =
    this.facade.especiales;

  readonly quantity =
    this.facade.quantity;

  readonly selectedSizeId =
    this.facade.selectedSizeId;

  readonly selectedBySlot =
    this.facade.selectedBySlot;

  readonly activeCustomizationKey =
    this.facade.activeCustomizationKey;

  /* =========================================================
     DERIVED STATE
     ========================================================= */

  readonly isSizeFixedPrice =
    this.facade.isSizeFixedPrice;

  readonly requiresSizeSelection =
    this.facade.requiresSizeSelection;

  readonly sizePriceOptions =
    this.facade.sizePriceOptions;

  readonly selectedSizePrice =
    this.facade.selectedSizePrice;

  readonly selectedSizeName =
    this.facade.selectedSizeName;

  readonly slots =
    this.facade.slots;

  readonly configuredSlotsCount =
    this.facade.configuredSlotsCount;

  readonly progressLabel =
    this.facade.progressLabel;

  readonly customizationItems =
    this.facade.customizationItems;

  readonly summaryItems =
    this.facade.summaryItems;

  readonly promotionBasePrice =
    this.facade.promotionBasePrice;

  readonly extrasPerUnitTotal =
    this.facade.extrasPerUnitTotal;

  readonly total =
    this.facade.total;

  readonly canSubmit =
    this.facade.canSubmit;

  /* =========================================================
     QUANTITY / SIZE
     ========================================================= */

  setQuantity(
    value:
      number |
      null |
      undefined,
  ): void {
    this.facade.setQuantity(
      value,
    );
  }

  onSelectSize(
    sizeId:
      number |
      null |
      undefined,
  ): void {
    this.facade.onSelectSize(
      sizeId,
    );
  }

  /* =========================================================
     PIZZA SELECTION
     ========================================================= */

  onPizzaSelectionChange(
    event:
      PromotionPizzaSelectionChange,
  ): void {
    this.facade.onPizzaSelectionChange(
      event,
    );
  }

  onCustomizePizza(
    slotKey:
      string,
  ): void {
    this.facade.onCustomizePizza(
      slotKey,
    );
  }

  /* =========================================================
     CUSTOMIZATION
     ========================================================= */

  onActivateCustomization(
    slotKey:
      string,
  ): void {
    this.facade.onActivateCustomization(
      slotKey,
    );
  }

  onResetCustomization(
    slotKey:
      string,
  ): void {
    this.facade.onResetCustomization(
      slotKey,
    );
  }

  onRemoveCustomizationBaseIngredient(
    event:
      PromotionCustomizerIngredientEvent,
  ): void {
    this.facade.onRemoveCustomizationBaseIngredient(
      event,
    );
  }

  onRestoreCustomizationBaseIngredient(
    event:
      PromotionCustomizerIngredientEvent,
  ): void {
    this.facade.onRestoreCustomizationBaseIngredient(
      event,
    );
  }

  onToggleCustomizationExtra(
    event:
      PromotionCustomizerExtraToggleEvent,
  ): void {
    this.facade.onToggleCustomizationExtra(
      event,
    );
  }

  onRemoveCustomizationExtra(
    event:
      PromotionCustomizerIngredientEvent,
  ): void {
    this.facade.onRemoveCustomizationExtra(
      event,
    );
  }

  /* =========================================================
     CART / NAVIGATION
     ========================================================= */

  addPromotionToCart(): void {
    this.facade.addPromotionToCart();
  }

  goCheckout(): void {
    this.facade.goCheckout();
  }

  goHome(): void {
    this.facade.goHome();
  }
}
