import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  EMPTY,
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  switchMap,
} from 'rxjs';

import { MessageService } from 'primeng/api';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SkeletonModule } from 'primeng/skeleton';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import {
  AppliesTo,
  BuilderQuoteRequestDto,
  BuilderQuoteResponseDto,
  CustomizationDto,
} from '../../../core/api/builder/builder.models';
import { BuilderApiService } from '../../../core/api/builder/builder-api.service';
import { CartStore } from '../../../core/api/cart/cart.store';
import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import {
  CategorySizePriceDto,
  IngredientDto,
  PizzaDto,
  SizeDto,
} from '../../../core/api/catalog/catalog.models';

interface Option<T> {
  label: string;
  value: T;
}

interface SelectedExtra {
  ingredient: IngredientDto;
  appliesTo: AppliesTo;
}

@Component({
  selector: 'app-pizza-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    ButtonModule,
    CheckboxModule,
    ChipModule,
    InputNumberModule,
    SelectModule,
    SelectButtonModule,
    SkeletonModule,
    ToggleSwitchModule,
  ],
  templateUrl: './pizza-builder.html',
  styleUrl: './pizza-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PizzaBuilder {
  private readonly catalogApi = inject(CatalogApiService);
  private readonly builderApi = inject(BuilderApiService);
  private readonly cart = inject(CartStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);

  readonly maxExtras = 4;
  readonly minQuantity = 1;
  readonly maxQuantity = 10;

  private readonly quoteRequests =
    new Subject<BuilderQuoteRequestDto | null>();

  private readonly quotedPayloadKey =
    signal<string | null>(null);

  private readonly lockTokens = {
    sauceWords: ['pasta', 'salsa'],
    tomato: ['tomate'],
    cheese: ['queso', 'mozzarella', 'mosarela'],
  };

  private readonly mandatoryBase = {
    sauceLabel: 'Pasta de tomate',
    cheeseLabel: 'Queso',
  };

  readonly appliesOptions: Option<AppliesTo>[] = [
    { label: 'Completa', value: 'ALL' },
    { label: 'Mitad A', value: 'A' },
    { label: 'Mitad B', value: 'B' },
  ];

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly quoteLoading = signal(false);
  readonly quoteError = signal<string | null>(null);
  readonly cartSubmitting = signal(false);

  readonly pizzaA = signal<PizzaDto | null>(null);
  readonly allPizzas = signal<PizzaDto[]>([]);
  readonly extrasCatalog = signal<IngredientDto[]>([]);

  readonly isHalfAndHalf = signal(false);
  readonly secondPizzaId = signal<number | null>(null);
  readonly selectedSizeId = signal<number | null>(null);
  readonly quantity = signal(1);

  readonly baseIngredientsA = signal<string[]>([]);
  readonly baseIngredientsB = signal<string[]>([]);
  readonly originalIngredientsA = signal<string[]>([]);
  readonly originalIngredientsB = signal<string[]>([]);

  readonly selectedExtras =
    signal<Map<number, SelectedExtra>>(new Map());

  readonly extrasAccordionOpen = signal(false);
  readonly quote =
    signal<BuilderQuoteResponseDto | null>(null);

  readonly fallbackImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
        <rect width="900" height="700" fill="#f3f5f4"/>
        <circle cx="450" cy="320" r="190" fill="#e7ece9"/>
        <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle"
              fill="#66736a" font-family="Arial" font-size="28">Sin imagen disponible</text>
      </svg>`,
    );

  readonly pizzaB = computed<PizzaDto | null>(() => {
    const id = this.secondPizzaId();

    return id
      ? this.allPizzas().find(
          pizza => pizza.id === id,
        ) ?? null
      : null;
  });

  readonly pizzaOptions =
    computed<Option<number>[]>(() => {
      const currentPizza = this.pizzaA();

      if (!currentPizza) {
        return [];
      }

      return this.allPizzas()
        .filter(pizza => pizza.id !== currentPizza.id)
        .map(pizza => ({
          label: pizza.name,
          value: pizza.id,
        }));
    });

  readonly availableSizePrices =
    computed<CategorySizePriceDto[]>(() => {
      const sizePrices =
        this.pizzaA()?.category.size_prices ?? [];

      return [...sizePrices]
        .filter(item => this.isValidSizePrice(item))
        .sort(
          (left, right) =>
            left.size.portion - right.size.portion,
        );
    });

  readonly selectedSizePrice =
    computed<CategorySizePriceDto | null>(() => {
      const sizeId = this.selectedSizeId();

      return (
        this.availableSizePrices().find(
          item => item.size.id === sizeId,
        ) ?? null
      );
    });

  readonly selectedSize = computed<SizeDto | null>(
    () => this.selectedSizePrice()?.size ?? null,
  );

  readonly heroImage = computed(
    () => this.pizzaA()?.image_url || this.fallbackImage,
  );

  readonly extrasCount = computed(
    () => this.selectedExtras().size,
  );

  readonly extrasAccordionValue = computed(() =>
    this.extrasAccordionOpen() ? 'extras' : null,
  );

  readonly basePrice = computed(
    () => this.quote()?.base_price ?? 0,
  );

  readonly extrasPrice = computed(
    () => this.quote()?.extras_total ?? 0,
  );

  readonly unitPrice = computed(
    () => this.quote()?.unit_price ?? 0,
  );

  readonly total = computed(
    () => this.quote()?.total ?? 0,
  );

  readonly estimatedBaseTotal = computed(() => {
    const price = Number(
      this.selectedSizePrice()?.price ?? 0,
    );

    return price * this.quantity();
  });

  readonly displayTotal = computed(
    () => this.quote()?.total ?? this.estimatedBaseTotal(),
  );

  readonly displayUnitPrice = computed(
    () =>
      this.quote()?.unit_price ??
      Number(this.selectedSizePrice()?.price ?? 0),
  );

  readonly quoteBreakdown = computed(
    () => this.quote()?.extras_breakdown ?? [],
  );

  readonly hasIngredientChangesA = computed(
    () =>
      !this.arraysEqual(
        this.baseIngredientsA(),
        this.originalIngredientsA(),
      ),
  );

  readonly hasIngredientChangesB = computed(
    () =>
      !this.arraysEqual(
        this.baseIngredientsB(),
        this.originalIngredientsB(),
      ),
  );

  readonly currentPayload = computed(
    () => this.buildQuotePayload(),
  );

  readonly currentPayloadKey = computed(() =>
    this.payloadKey(this.currentPayload()),
  );

  readonly quoteIsCurrent = computed(
    () =>
      !!this.quote() &&
      this.quotedPayloadKey() ===
        this.currentPayloadKey(),
  );

  readonly hasValidSizes = computed(
    () => this.availableSizePrices().length > 0,
  );

  readonly dinersLabel = computed(() => {
    const size = this.selectedSize();

    if (!size) {
      return 'Elige un tamaño para ver la capacidad.';
    }

    return this.getServingHint(size.portion);
  });

  readonly configurationTitle = computed(() => {
    const pizza = this.pizzaA();
    const pizzaB = this.pizzaB();

    if (!pizza) {
      return 'Tu pizza';
    }

    if (this.isHalfAndHalf() && pizzaB) {
      return `${pizza.name} + ${pizzaB.name}`;
    }

    return pizza.name;
  });

  readonly canCheckout = computed(() => {
    if (!this.currentPayload()) {
      return false;
    }

    if (!this.hasValidSizes()) {
      return false;
    }

    if (this.displayUnitPrice() <= 0) {
      return false;
    }

    if (this.displayTotal() <= 0) {
      return false;
    }

    return (
      this.quoteIsCurrent() &&
      !this.quoteLoading() &&
      !this.quoteError() &&
      !this.cartSubmitting()
    );
  });

  readonly configurationHint = computed(() => {
    if (!this.hasValidSizes()) {
      return 'Esta pizza no tiene tamaños disponibles para pedido en este momento.';
    }

    if (!this.selectedSize()) {
      return 'Selecciona un tamaño para continuar.';
    }

    if (this.displayUnitPrice() <= 0) {
      return 'El tamaño seleccionado no está disponible para esta pizza.';
    }

    if (this.isHalfAndHalf() && !this.pizzaB()) {
      return 'Selecciona la segunda mitad para continuar.';
    }

    if (this.quoteError()) {
      return this.quoteError()!;
    }

    if (this.quoteLoading()) {
      return 'Actualizando el precio de tu pedido…';
    }

    return 'Tu pedido está validado y listo para agregar al carrito.';
  });

  readonly baseLocksHint = computed(
    () =>
      'La salsa de tomate y el queso son ingredientes base y no se pueden quitar.',
  );

  constructor() {
    this.setupQuotePipeline();
    this.setupQuoteAutoRecalculation();
    this.load();

    effect(() => {
      const available = this.availableSizePrices();
      const current = this.selectedSizeId();

      if (available.length === 0) {
        if (current !== null) {
          this.selectedSizeId.set(null);
        }
        return;
      }

      const exists = available.some(
        item => item.size.id === current,
      );

      if (!exists) {
        this.selectedSizeId.set(
          available[0].size.id,
        );
      }
    });
  }

  goBack(): void {
    void this.router.navigateByUrl('/');
  }

  retryLoad(): void {
    this.load();
  }

  setSize(sizeId: number): void {
    const exists = this.availableSizePrices().some(
      item => item.size.id === sizeId,
    );

    if (!exists) {
      return;
    }

    if (this.selectedSizeId() === sizeId) {
      return;
    }

    this.selectedSizeId.set(sizeId);
  }

  setQuantity(value: number | null | undefined): void {
    const numericValue = Number(
      value ?? this.minQuantity,
    );

    const normalized = Number.isFinite(numericValue)
      ? Math.trunc(numericValue)
      : this.minQuantity;

    this.quantity.set(
      Math.max(
        this.minQuantity,
        Math.min(this.maxQuantity, normalized),
      ),
    );
  }

  setHalfAndHalf(enabled: boolean): void {
    this.isHalfAndHalf.set(enabled);

    if (enabled) {
      return;
    }

    this.secondPizzaId.set(null);
    this.baseIngredientsB.set([]);
    this.originalIngredientsB.set([]);

    const normalizedExtras = new Map(
      this.selectedExtras(),
    );

    for (const [id, selected] of normalizedExtras.entries()) {
      normalizedExtras.set(id, {
        ...selected,
        appliesTo: 'ALL',
      });
    }

    this.selectedExtras.set(normalizedExtras);
  }

  setSecondPizzaId(id: number | null): void {
    this.secondPizzaId.set(id);

    const pizza = id
      ? this.allPizzas().find(
          item => item.id === id,
        ) ?? null
      : null;

    const ingredients =
      this.getBaseIngredientsFromPizza(pizza);

    this.baseIngredientsB.set(ingredients);
    this.originalIngredientsB.set([...ingredients]);
  }

  onExtrasAccordionChange(value: unknown): void {
    this.extrasAccordionOpen.set(
      value === 'extras',
    );
  }

  isBaseIngredientLocked(name: string): boolean {
    const normalized = this.normalizeText(name);

    const isCheese =
      this.lockTokens.cheese.some(token =>
        normalized.includes(token),
      );

    const isTomatoSauce =
      this.lockTokens.tomato.some(token =>
        normalized.includes(token),
      ) &&
      this.lockTokens.sauceWords.some(token =>
        normalized.includes(token),
      );

    return (
      isCheese ||
      isTomatoSauce ||
      normalized ===
        this.normalizeText(
          this.mandatoryBase.sauceLabel,
        ) ||
      normalized ===
        this.normalizeText(
          this.mandatoryBase.cheeseLabel,
        )
    );
  }

  removeBaseIngredientA(name: string): void {
    if (this.isBaseIngredientLocked(name)) {
      return;
    }

    this.baseIngredientsA.set(
      this.baseIngredientsA().filter(
        item => item !== name,
      ),
    );
  }

  removeBaseIngredientB(name: string): void {
    if (this.isBaseIngredientLocked(name)) {
      return;
    }

    this.baseIngredientsB.set(
      this.baseIngredientsB().filter(
        item => item !== name,
      ),
    );
  }

  resetBaseIngredientsA(): void {
    this.baseIngredientsA.set([
      ...this.originalIngredientsA(),
    ]);
  }

  resetBaseIngredientsB(): void {
    this.baseIngredientsB.set([
      ...this.originalIngredientsB(),
    ]);
  }

  isExtraDisabled(extra: IngredientDto): boolean {
    return (
      !this.selectedExtras().has(extra.id) &&
      this.extrasCount() >= this.maxExtras
    );
  }

  toggleExtra(
    extra: IngredientDto,
    checked: boolean,
  ): void {
    const extras = new Map(this.selectedExtras());

    if (checked) {
      if (
        extras.size >= this.maxExtras &&
        !extras.has(extra.id)
      ) {
        return;
      }

      extras.set(extra.id, {
        ingredient: extra,
        appliesTo: 'ALL',
      });
    } else {
      extras.delete(extra.id);
    }

    this.selectedExtras.set(extras);
  }

  setExtraAppliesTo(
    extraId: number,
    appliesTo: AppliesTo,
  ): void {
    const extras = new Map(this.selectedExtras());
    const selected = extras.get(extraId);

    if (!selected) {
      return;
    }

    extras.set(extraId, {
      ...selected,
      appliesTo: this.isHalfAndHalf()
        ? appliesTo
        : 'ALL',
    });

    this.selectedExtras.set(extras);
  }

  extraPriceFor(extra: IngredientDto): number {
    const sizeId = this.selectedSizeId();

    if (!sizeId) {
      return 0;
    }

    const price =
      extra.extra_prices?.find(
        item => item.size.id === sizeId,
      )?.extra_price;

    return Number(price ?? 0);
  }

  formatMoney(
    value: number | string | null | undefined,
  ): string {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(
      Number.isFinite(numericValue)
        ? numericValue
        : 0,
    );
  }

  formatPortions(size: SizeDto | null): string {
    if (!size) {
      return 'Sin tamaño seleccionado';
    }

    return `${size.portion} porciones`;
  }

  getServingHint(portions: number): string {
    if (portions <= 4) {
      return 'Ideal para 1 persona';
    }

    if (portions <= 6) {
      return 'Ideal para 1 o 2 personas';
    }

    if (portions <= 8) {
      return 'Ideal para 2 o 3 personas';
    }

    if (portions <= 10) {
      return 'Ideal para 3 o 4 personas';
    }

    return 'Ideal para compartir';
  }

  addToCart(): void {
    this.submitPizzaToCart(false);
  }

  buyNow(): void {
    this.submitPizzaToCart(true);
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.resetConfiguration();

    const rawName =
      this.route.snapshot.paramMap.get('name') ?? '';
    const name =
      decodeURIComponent(rawName).trim();

    if (!name) {
      this.error.set(
        'No se encontró la pizza solicitada.',
      );
      this.loading.set(false);
      return;
    }

    this.catalogApi
      .getAllPizzas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: pizzas =>
          this.allPizzas.set(pizzas ?? []),
        error: () => this.allPizzas.set([]),
      });

    this.catalogApi
      .getIngredients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ingredients =>
          this.extrasCatalog.set(
            ingredients ?? [],
          ),
        error: () => this.extrasCatalog.set([]),
      });

    this.catalogApi
      .getPizzaByName(name)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: pizza => {
          this.pizzaA.set(pizza);

          const baseIngredients =
            this.getBaseIngredientsFromPizza(pizza);

          this.baseIngredientsA.set(baseIngredients);
          this.originalIngredientsA.set([
            ...baseIngredients,
          ]);

          const firstAvailableSize =
            [...(pizza.category.size_prices ?? [])]
              .filter(item =>
                this.isValidSizePrice(item),
              )
              .sort(
                (left, right) =>
                  left.size.portion -
                  right.size.portion,
              )
              .at(0);

          this.selectedSizeId.set(
            firstAvailableSize?.size.id ?? null,
          );
        },
        error: (error: Error) => {
          this.error.set(
            error.message ||
              'No se pudo cargar la pizza.',
          );
        },
      });
  }

  private resetConfiguration(): void {
    this.pizzaA.set(null);
    this.isHalfAndHalf.set(false);
    this.secondPizzaId.set(null);
    this.selectedSizeId.set(null);
    this.quantity.set(1);
    this.baseIngredientsA.set([]);
    this.baseIngredientsB.set([]);
    this.originalIngredientsA.set([]);
    this.originalIngredientsB.set([]);
    this.selectedExtras.set(new Map());
    this.extrasAccordionOpen.set(false);
    this.quote.set(null);
    this.quoteError.set(null);
    this.quoteLoading.set(false);
    this.quotedPayloadKey.set(null);
  }

  private setupQuoteAutoRecalculation(): void {
    effect(() => {
      const payload = this.currentPayload();
      this.quoteRequests.next(payload);
    });
  }

  private setupQuotePipeline(): void {
    this.quoteRequests
      .pipe(
        debounceTime(250),
        distinctUntilChanged(
          (previous, current) =>
            this.payloadKey(previous) ===
            this.payloadKey(current),
        ),
        switchMap(payload => {
          if (!payload) {
            this.quote.set(null);
            this.quoteError.set(null);
            this.quoteLoading.set(false);
            this.quotedPayloadKey.set(null);
            return EMPTY;
          }

          const key = this.payloadKey(payload);

          this.quoteLoading.set(true);
          this.quoteError.set(null);

          return this.builderApi.quote(payload).pipe(
            catchError((error: Error) => {
              this.quoteError.set(
                error.message ||
                  'No se pudo actualizar el precio.',
              );
              this.quotedPayloadKey.set(null);
              return EMPTY;
            }),
            finalize(() =>
              this.quoteLoading.set(false),
            ),
            switchMap(response => {
              this.quote.set(response);
              this.quotedPayloadKey.set(key);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private buildQuotePayload():
    | BuilderQuoteRequestDto
    | null {
    const pizzaA = this.pizzaA();
    const pizzaB = this.pizzaB();
    const selectedSize = this.selectedSize();
    const selectedSizePrice =
      this.selectedSizePrice();
    const quantity = this.quantity();

    if (!pizzaA || !selectedSize || !selectedSizePrice) {
      return null;
    }

    if (Number(selectedSizePrice.price) <= 0) {
      return null;
    }

    if (
      quantity < this.minQuantity ||
      quantity > this.maxQuantity
    ) {
      return null;
    }

    if (this.isHalfAndHalf() && !pizzaB) {
      return null;
    }

    const customizations: CustomizationDto[] = [
      ...this.buildRemovedIngredientCustomizations(
        pizzaA,
        this.originalIngredientsA(),
        this.baseIngredientsA(),
        this.isHalfAndHalf() ? 'A' : 'ALL',
      ),
      ...(pizzaB
        ? this.buildRemovedIngredientCustomizations(
            pizzaB,
            this.originalIngredientsB(),
            this.baseIngredientsB(),
            'B',
          )
        : []),
      ...Array.from(
        this.selectedExtras().entries(),
      ).map(([ingredientId, selected]) => ({
        action: 'extra' as const,
        ingredient_id: ingredientId,
        applies_to: this.isHalfAndHalf()
          ? selected.appliesTo
          : 'ALL',
      })),
    ];

    const extras = customizations
      .filter(item => item.action === 'extra')
      .map(item => ({
        ingredient_id: item.ingredient_id,
        applies_to: item.applies_to,
      }));

    return {
      pizza_id: pizzaA.id,
      is_half_and_half: this.isHalfAndHalf(),
      second_pizza_id: this.isHalfAndHalf()
        ? pizzaB?.id ?? null
        : null,
      size_id: selectedSize.id,
      quantity,
      customizations,
      extras,
    };
  }

  private buildRemovedIngredientCustomizations(
    pizza: PizzaDto,
    originalNames: string[],
    currentNames: string[],
    appliesTo: AppliesTo,
  ): CustomizationDto[] {
    const current = new Set(
      currentNames.map(name =>
        this.normalizeText(name),
      ),
    );

    const removedNames = originalNames.filter(
      name =>
        !current.has(this.normalizeText(name)) &&
        !this.isBaseIngredientLocked(name),
    );

    return removedNames.flatMap(name => {
      const ingredient =
        pizza.ingredients?.find(
          item =>
            this.normalizeText(item.name) ===
            this.normalizeText(name),
        );

      return ingredient
        ? [
            {
              action: 'remove' as const,
              ingredient_id: ingredient.id,
              applies_to: appliesTo,
            },
          ]
        : [];
    });
  }

  private submitPizzaToCart(
    goToCheckout: boolean,
  ): void {
    if (!this.canCheckout() || this.cartSubmitting()) {
      return;
    }

    const payload = this.currentPayload();

    if (!payload) {
      return;
    }

    this.cartSubmitting.set(true);

    this.cart
      .addPizza(payload)
      .pipe(
        finalize(() =>
          this.cartSubmitting.set(false),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: () => {
          this.messages.add({
            severity: 'success',
            summary: goToCheckout
              ? 'Pedido listo'
              : 'Pizza agregada',
            detail: goToCheckout
              ? 'Tu pizza quedó lista. Continuemos con el pago.'
              : 'La pizza se agregó correctamente al carrito.',
            life: 2400,
          });

          if (goToCheckout) {
            void this.router.navigate([
              '/checkout',
            ]);
          }
        },
        error: (error: unknown) => {
          const message =
            typeof error === 'object' &&
            error !== null &&
            'message' in error
              ? String(error.message)
              : 'No fue posible agregar la pizza al carrito.';

          this.messages.add({
            severity: 'error',
            summary: 'No se pudo agregar',
            detail: message,
            life: 3200,
          });
        },
      });
  }

  private getBaseIngredientsFromPizza(
    pizza: PizzaDto | null,
  ): string[] {
    if (!pizza) {
      return [];
    }

    const fromRelationship =
      (pizza.ingredients ?? [])
        .map(ingredient => ingredient.name?.trim())
        .filter(
          (name): name is string => !!name,
        );

    const fromDescription =
      (pizza.description ?? '')
        .split(',')
        .map(name => name.trim())
        .filter(Boolean);

    return this.ensureMandatoryBase(
      fromRelationship.length
        ? fromRelationship
        : fromDescription,
    );
  }

  private ensureMandatoryBase(
    ingredients: string[],
  ): string[] {
    const normalized = ingredients.map(ingredient =>
      this.normalizeText(ingredient),
    );

    const hasSauce = normalized.some(
      name =>
        this.lockTokens.tomato.some(token =>
          name.includes(token),
        ) &&
        this.lockTokens.sauceWords.some(token =>
          name.includes(token),
        ),
    );

    const hasCheese = normalized.some(name =>
      this.lockTokens.cheese.some(token =>
        name.includes(token),
      ),
    );

    const result = [...ingredients];

    if (!hasCheese) {
      result.unshift(
        this.mandatoryBase.cheeseLabel,
      );
    }

    if (!hasSauce) {
      result.unshift(
        this.mandatoryBase.sauceLabel,
      );
    }

    const unique = new Set<string>();

    return result.filter(ingredient => {
      const key =
        this.normalizeText(ingredient);

      if (unique.has(key)) {
        return false;
      }

      unique.add(key);
      return true;
    });
  }

  private arraysEqual(
    left: string[],
    right: string[],
  ): boolean {
    return (
      left.length === right.length &&
      left.every(
        (value, index) =>
          value === right[index],
      )
    );
  }

  private payloadKey(
    payload: BuilderQuoteRequestDto | null,
  ): string | null {
    return payload ? JSON.stringify(payload) : null;
  }

  private normalizeText(value: string): string {
    return (value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private isValidSizePrice(
    item: CategorySizePriceDto | null | undefined,
  ): boolean {
    const price = Number(item?.price ?? 0);

    return (
      !!item?.size?.id &&
      Number.isFinite(price) &&
      price > 0
    );
  }
}
