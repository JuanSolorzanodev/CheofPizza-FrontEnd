import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { MessageService } from 'primeng/api';

import { PromotionApiService } from '../../../core/api/promotions/promotion-api.service';
import { PromotionDto } from '../../../core/api/promotions/promotion.models';
import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import {
  IngredientDto,
  PizzaDto,
  PizzaIngredientDto,
} from '../../../core/api/catalog/catalog.models';
import { CartStore } from '../../../core/api/cart/cart.store';
import { CartAddPromotionRequestDto } from '../../../core/api/cart/cart.models';

interface SelectOption<T> {
  label: string;
  value: T;
}

type SlotKind = 'especial' | 'sencilla';

interface PromotionSlot {
  key: string;
  index: number;
  kind: SlotKind;
  title: string;
  shortTitle: string;
  helper: string;
}

interface SlotCustomizationState {
  removedIngredientIds: number[];
  extraIngredientIds: number[];
}

@Component({
  selector: 'app-promotion-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    ButtonModule,
    SelectModule,
    InputNumberModule,
    TagModule,
    SkeletonModule,
    CheckboxModule,
    ChipModule,
  ],
  templateUrl: './promotion-detail-page.html',
  styleUrl: './promotion-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromotionDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly promotionApi = inject(PromotionApiService);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly cart = inject(CartStore);
  private readonly messageService = inject(MessageService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly promotion = signal<PromotionDto | null>(null);
  readonly sencillas = signal<PizzaDto[]>([]);
  readonly especiales = signal<PizzaDto[]>([]);
  readonly ingredients = signal<IngredientDto[]>([]);

  readonly quantity = signal<number>(1);
  readonly selectedBySlot = signal<Record<string, number | null>>({});
  readonly slotState = signal<Record<string, SlotCustomizationState>>({});
  readonly activeCustomizationKey = signal<string | null>(null);

  private readonly lockTokens = {
    sauceWords: ['pasta', 'salsa'],
    tomato: ['tomate'],
    cheese: ['queso', 'mozzarella', 'mosarela'],
  };

  readonly promotionSizeName = computed(() =>
    this.promotion()?.details?.[0]?.size?.name ?? '—'
  );

  readonly selectionRules = computed(() => {
    const rules = this.promotion()?.selection_rules;

    return {
      allows_extras: rules?.allows_extras ?? true,
      allows_remove_ingredients: rules?.allows_remove_ingredients ?? true,
      max_extras_per_pizza: Number(rules?.max_extras_per_pizza ?? 8),
      allow_duplicate_ingredients_as_extra:
        rules?.allow_duplicate_ingredients_as_extra ?? false,
    };
  });

  readonly slots = computed<PromotionSlot[]>(() => {
    const promotion = this.promotion();
    if (!promotion) return [];

    const details = promotion.details ?? [];
    const built: PromotionSlot[] = [];
    let counter = 1;

    for (const detail of details) {
      const qty = Number(detail.required_quantity ?? 0);
      const categoryName = (detail.category?.name ?? '').toLowerCase();

      const kind: SlotKind =
        categoryName.includes('especial') ? 'especial' : 'sencilla';

      for (let i = 0; i < qty; i++) {
        built.push({
          key: `${kind}-${counter}-${i}`,
          index: counter,
          kind,
          title:
            kind === 'especial'
              ? 'Elige tu pizza especial'
              : 'Elige tu pizza sencilla',
          shortTitle:
            kind === 'especial' ? 'Pizza especial' : 'Pizza sencilla',
          helper:
            kind === 'especial'
              ? 'Selecciona una pizza especial para continuar.'
              : 'Selecciona una pizza sencilla para continuar.',
        });
        counter++;
      }
    }

    return built;
  });

  readonly configuredSlotsCount = computed(() =>
    this.slots().filter((slot) => !!this.selectedBySlot()[slot.key]).length
  );

  readonly selectionsComplete = computed(
    () => this.configuredSlotsCount() === this.slots().length && this.slots().length > 0
  );

  readonly progressLabel = computed(() => {
    const total = this.slots().length;
    const done = this.configuredSlotsCount();

    if (!total) return 'Cargando promoción...';
    if (done === 0) return 'Empieza eligiendo tus pizzas';
    if (done < total) return `Ya elegiste ${done} de ${total} pizzas`;
    return 'Perfecto, ahora puedes revisar y personalizar tu pedido';
  });

  readonly selectedItemsPayload = computed(() => {
    return this.slots()
      .map((slot) => {
        const pizzaId = this.selectedBySlot()[slot.key] ?? null;
        if (!pizzaId) return null;

        const state = this.getSlotState(slot);

        return {
          pizza_id: pizzaId,
          customizations: [
            ...state.removedIngredientIds.map((ingredientId) => ({
              action: 'remove' as const,
              ingredient_id: ingredientId,
              applies_to: 'ALL' as const,
            })),
            ...state.extraIngredientIds.map((ingredientId) => ({
              action: 'extra' as const,
              ingredient_id: ingredientId,
              applies_to: 'ALL' as const,
            })),
          ],
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  });

  readonly extrasPerUnitTotal = computed(() =>
    this.slots().reduce((acc, slot) => acc + this.slotExtrasTotal(slot), 0)
  );

  readonly unitPrice = computed(() => {
    const promo = this.promotion();
    if (!promo) return 0;

    return Number(promo.price ?? 0) + this.extrasPerUnitTotal();
  });

  readonly total = computed(() => this.unitPrice() * this.quantity());

  readonly canSubmit = computed(() => {
    return (
      !!this.promotion() &&
      this.selectedItemsPayload().length === this.slots().length &&
      this.quantity() >= 1 &&
      this.quantity() <= 10 &&
      !this.submitting()
    );
  });

  constructor() {
    this.load();
  }

  private load(): void {
    const slug = (this.route.snapshot.paramMap.get('slug') ?? '').trim();

    if (!slug) {
      this.error.set('Promoción inválida.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      promotion: this.promotionApi.getPromotionBySlug(slug),
      sencillas: this.catalogApi.getPizzasSencillas(),
      especiales: this.catalogApi.getPizzasEspeciales(),
      ingredients: this.catalogApi.getIngredients(),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ promotion, sencillas, especiales, ingredients }) => {
          this.promotion.set(promotion);
          this.sencillas.set(sencillas ?? []);
          this.especiales.set(especiales ?? []);
          this.ingredients.set(ingredients ?? []);
          this.quantity.set(1);

          const selectedBySlot: Record<string, number | null> = {};
          const slotState: Record<string, SlotCustomizationState> = {};
          const builtSlots = this.buildSlotsFromPromotion(promotion);

          for (const slot of builtSlots) {
            selectedBySlot[slot.key] = null;
            slotState[slot.key] = {
              removedIngredientIds: [],
              extraIngredientIds: [],
            };
          }

          this.selectedBySlot.set(selectedBySlot);
          this.slotState.set(slotState);
          this.activeCustomizationKey.set(null);
        },
        error: (e: Error) => {
          this.error.set(e.message);
        },
      });
  }

  private buildSlotsFromPromotion(promotion: PromotionDto): PromotionSlot[] {
    const details = promotion.details ?? [];
    const built: PromotionSlot[] = [];
    let counter = 1;

    for (const detail of details) {
      const qty = Number(detail.required_quantity ?? 0);
      const categoryName = (detail.category?.name ?? '').toLowerCase();

      const kind: SlotKind =
        categoryName.includes('especial') ? 'especial' : 'sencilla';

      for (let i = 0; i < qty; i++) {
        built.push({
          key: `${kind}-${counter}-${i}`,
          index: counter,
          kind,
          title:
            kind === 'especial'
              ? 'Elige tu pizza especial'
              : 'Elige tu pizza sencilla',
          shortTitle:
            kind === 'especial' ? 'Pizza especial' : 'Pizza sencilla',
          helper:
            kind === 'especial'
              ? 'Selecciona una pizza especial para continuar.'
              : 'Selecciona una pizza sencilla para continuar.',
        });
        counter++;
      }
    }

    return built;
  }

  setQuantity(value: number | null | undefined): void {
    const n = Number(value ?? 1);
    const safe = Math.max(1, Math.min(10, Math.trunc(n || 1)));
    this.quantity.set(safe);
  }

  optionsForSlot(slot: PromotionSlot): SelectOption<number>[] {
    const list = slot.kind === 'especial' ? this.especiales() : this.sencillas();
    return list.map((pizza) => ({
      label: pizza.name,
      value: pizza.id,
    }));
  }

  onSelectPizza(slot: PromotionSlot, pizzaId: number | null): void {
    const currentSelected = { ...this.selectedBySlot() };
    currentSelected[slot.key] = pizzaId;
    this.selectedBySlot.set(currentSelected);

    const currentState = { ...this.slotState() };
    currentState[slot.key] = {
      removedIngredientIds: [],
      extraIngredientIds: [],
    };
    this.slotState.set(currentState);

    if (pizzaId) {
      this.activeCustomizationKey.set(slot.key);
    } else if (this.activeCustomizationKey() === slot.key) {
      this.activeCustomizationKey.set(null);
    }
  }

  getSelectedPizza(slot: PromotionSlot): PizzaDto | null {
    const pizzaId = this.selectedBySlot()[slot.key] ?? null;
    if (!pizzaId) return null;

    const list = slot.kind === 'especial' ? this.especiales() : this.sencillas();
    return list.find((pizza) => pizza.id === pizzaId) ?? null;
  }

  getSelectedSlots(): PromotionSlot[] {
    return this.slots().filter((slot) => !!this.selectedBySlot()[slot.key]);
  }

  isCustomizationActive(slot: PromotionSlot): boolean {
    return this.activeCustomizationKey() === slot.key;
  }

  activateCustomization(slot: PromotionSlot): void {
    if (!this.getSelectedPizza(slot)) return;
    this.activeCustomizationKey.set(slot.key);
  }

  getBaseIngredients(slot: PromotionSlot): PizzaIngredientDto[] {
    return this.getSelectedPizza(slot)?.ingredients ?? [];
  }

  getVisibleBaseIngredients(slot: PromotionSlot): PizzaIngredientDto[] {
    const removedIds = new Set(this.getSlotState(slot).removedIngredientIds);
    return this.getBaseIngredients(slot).filter((ingredient) => !removedIds.has(ingredient.id));
  }

  getRemovedBaseIngredients(slot: PromotionSlot): PizzaIngredientDto[] {
    const removedIds = new Set(this.getSlotState(slot).removedIngredientIds);
    return this.getBaseIngredients(slot).filter((ingredient) => removedIds.has(ingredient.id));
  }

  canRemoveBaseIngredient(name: string): boolean {
    if (!this.selectionRules().allows_remove_ingredients) return false;
    return !this.isBaseIngredientLocked(name);
  }

  removeBaseIngredient(slot: PromotionSlot, ingredient: PizzaIngredientDto): void {
    if (!this.canRemoveBaseIngredient(ingredient.name)) return;

    const current = { ...this.slotState() };
    const state = this.getSlotState(slot);

    if (!state.removedIngredientIds.includes(ingredient.id)) {
      state.removedIngredientIds = [...state.removedIngredientIds, ingredient.id];
    }

    current[slot.key] = state;
    this.slotState.set(current);
  }

  restoreBaseIngredient(slot: PromotionSlot, ingredientId: number): void {
    const current = { ...this.slotState() };
    const state = this.getSlotState(slot);

    state.removedIngredientIds = state.removedIngredientIds.filter((id) => id !== ingredientId);

    current[slot.key] = state;
    this.slotState.set(current);
  }

  isExtraSelected(slot: PromotionSlot, ingredientId: number): boolean {
    return this.getSlotState(slot).extraIngredientIds.includes(ingredientId);
  }

  extraCount(slot: PromotionSlot): number {
    return this.getSlotState(slot).extraIngredientIds.length;
  }

  canAddMoreExtras(slot: PromotionSlot): boolean {
    return this.extraCount(slot) < this.selectionRules().max_extras_per_pizza;
  }

  toggleExtra(slot: PromotionSlot, ingredientId: number, checked: boolean): void {
    const ingredient = this.ingredients().find((x) => x.id === ingredientId);
    if (!ingredient) return;

    const alreadySelected = this.isExtraSelected(slot, ingredientId);

    if (checked && !alreadySelected && this.isExtraDisabled(slot, ingredient)) {
      return;
    }

    const current = { ...this.slotState() };
    const state = this.getSlotState(slot);

    if (checked) {
      if (!state.extraIngredientIds.includes(ingredientId)) {
        state.extraIngredientIds = [...state.extraIngredientIds, ingredientId];
      }
    } else {
      state.extraIngredientIds = state.extraIngredientIds.filter((id) => id !== ingredientId);
    }

    current[slot.key] = state;
    this.slotState.set(current);
  }

  isExtraDisabled(slot: PromotionSlot, ingredient: IngredientDto): boolean {
    const pizza = this.getSelectedPizza(slot);
    if (!pizza) return true;

    if (!this.selectionRules().allows_extras) return true;

    const ingredientId = ingredient.id;
    const selected = this.isExtraSelected(slot, ingredientId);

    if (selected) return false;

    const baseIngredientIds = new Set(this.getBaseIngredients(slot).map((x) => x.id));
    const isBaseIngredient = baseIngredientIds.has(ingredientId);

    if (isBaseIngredient && !this.selectionRules().allow_duplicate_ingredients_as_extra) {
      return true;
    }

    if (!this.canAddMoreExtras(slot)) {
      return true;
    }

    return false;
  }

  extraDisabledReason(slot: PromotionSlot, ingredient: IngredientDto): string | null {
    const pizza = this.getSelectedPizza(slot);
    if (!pizza) return 'Primero elige una pizza.';

    if (!this.selectionRules().allows_extras) return 'Esta promoción no permite extras.';

    const ingredientId = ingredient.id;
    const selected = this.isExtraSelected(slot, ingredientId);

    if (selected) return null;

    const baseIngredientIds = new Set(this.getBaseIngredients(slot).map((x) => x.id));
    const isBaseIngredient = baseIngredientIds.has(ingredientId);

    if (isBaseIngredient && !this.selectionRules().allow_duplicate_ingredients_as_extra) {
      return 'Este ingrediente ya viene incluido.';
    }

    if (!this.canAddMoreExtras(slot)) {
      return `Máximo ${this.selectionRules().max_extras_per_pizza} extras por pizza.`;
    }

    return null;
  }

  extraPriceValue(ingredientId: number): number {
    const sizeId = this.promotion()?.details?.[0]?.size?.id ?? null;
    const ingredient = this.ingredients().find((x) => x.id === ingredientId);

    if (!sizeId || !ingredient) return 0;

    const found = ingredient.extra_prices?.find((x) => x.size.id === sizeId);
    return Number(found?.extra_price ?? 0);
  }

  extraPriceLabel(ingredientId: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(this.extraPriceValue(ingredientId));
  }

  slotExtrasTotal(slot: PromotionSlot): number {
    return this.getSlotState(slot).extraIngredientIds.reduce((acc, ingredientId) => {
      return acc + this.extraPriceValue(ingredientId);
    }, 0);
  }

  selectedExtraIngredients(slot: PromotionSlot): IngredientDto[] {
    const selectedIds = new Set(this.getSlotState(slot).extraIngredientIds);
    return this.ingredients().filter((ingredient) => selectedIds.has(ingredient.id));
  }

  removeExtra(slot: PromotionSlot, ingredientId: number): void {
    const current = { ...this.slotState() };
    const state = this.getSlotState(slot);

    state.extraIngredientIds = state.extraIngredientIds.filter((id) => id !== ingredientId);

    current[slot.key] = state;
    this.slotState.set(current);
  }

  resetSlot(slot: PromotionSlot): void {
    const current = { ...this.slotState() };
    current[slot.key] = {
      removedIngredientIds: [],
      extraIngredientIds: [],
    };
    this.slotState.set(current);
  }

  slotSummary(slot: PromotionSlot): string {
    const pizza = this.getSelectedPizza(slot);
    if (!pizza) return 'Aún no la has elegido';

    const removed = this.getRemovedBaseIngredients(slot).length;
    const extras = this.extraCount(slot);

    const parts = [pizza.name];
    if (removed > 0) parts.push(`sin ${removed} ingrediente(s)`);
    if (extras > 0) parts.push(`${extras} extra(s)`);

    return parts.join(' • ');
  }

  addPromotionToCart(): void {
    const promotion = this.promotion();
    if (!promotion) return;

    if (!this.canSubmit()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Falta completar tu pedido',
        detail: 'Primero elige todas las pizzas de la promoción.',
      });
      return;
    }

    const payload: CartAddPromotionRequestDto = {
      promotion_id: promotion.id,
      quantity: this.quantity(),
      selected_items: this.selectedItemsPayload(),
    };

    this.submitting.set(true);

    this.cart
      .addPromotion(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: '¡Listo!',
            detail: 'Tu promoción se agregó correctamente al carrito.',
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo agregar',
            detail:
              err?.error?.message ||
              err?.message ||
              'Ocurrió un error al agregar la promoción.',
          });
        },
      });
  }

  goCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  private getSlotState(slot: PromotionSlot): SlotCustomizationState {
    return (
      this.slotState()[slot.key] ?? {
        removedIngredientIds: [],
        extraIngredientIds: [],
      }
    );
  }

  private isBaseIngredientLocked(name: string): boolean {
    const normalized = this.normalizeText(name);

    const isCheese = this.lockTokens.cheese.some((token) => normalized.includes(token));
    const hasTomato = this.lockTokens.tomato.some((token) => normalized.includes(token));
    const hasSauceWord = this.lockTokens.sauceWords.some((token) => normalized.includes(token));
    const isSauce = hasTomato && hasSauceWord;

    return isCheese || isSauce;
  }

  private normalizeText(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
