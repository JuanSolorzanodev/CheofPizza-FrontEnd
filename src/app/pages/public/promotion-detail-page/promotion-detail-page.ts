import {
  CommonModule,
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  takeUntilDestroyed,
} from '@angular/core/rxjs-interop';

import {
  FormsModule,
} from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterModule,
} from '@angular/router';

import {
  finalize,
  forkJoin,
} from 'rxjs';

import {
  MessageService,
} from 'primeng/api';

import {
  ButtonModule,
} from 'primeng/button';

import {
  CheckboxModule,
} from 'primeng/checkbox';

import {
  ChipModule,
} from 'primeng/chip';

import {
  InputNumberModule,
} from 'primeng/inputnumber';

import {
  SelectModule,
} from 'primeng/select';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  TagModule,
} from 'primeng/tag';

import {
  CartAddPromotionRequestDto,
} from '../../../core/api/cart/cart.models';

import {
  CartStore,
} from '../../../core/api/cart/cart.store';

import {
  CatalogApiService,
} from '../../../core/api/catalog/catalog-api.service';

import {
  IngredientDto,
  PizzaDto,
  PizzaIngredientDto,
} from '../../../core/api/catalog/catalog.models';

import {
  PromotionApiService,
} from '../../../core/api/promotions/promotion-api.service';

import {
  PromotionDto,
  PromotionSizePriceDto,
  PromotionType,
} from '../../../core/api/promotions/promotion.models';

interface SelectOption<T> {
  label: string;
  value: T;
}

type SlotKind =
  | 'especial'
  | 'sencilla'
  | 'any';

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
  selector:
    'app-promotion-detail-page',

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

  templateUrl:
    './promotion-detail-page.html',

  styleUrl:
    './promotion-detail-page.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionDetailPage {
  /**
   * Regla única de negocio para toda la pantalla.
   *
   * Cada pizza de una promoción puede tener como máximo
   * cuatro ingredientes extra.
   *
   * Aunque la API entregue accidentalmente otro número,
   * este componente nunca permitirá superar este límite.
   */
  readonly maxExtrasPerPizza = 4;

  private readonly route =
    inject(ActivatedRoute);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly promotionApi =
    inject(PromotionApiService);

  private readonly catalogApi =
    inject(CatalogApiService);

  readonly cart =
    inject(CartStore);

  private readonly messageService =
    inject(MessageService);

  readonly loading =
    signal(true);

  readonly submitting =
    signal(false);

  readonly error =
    signal<string | null>(null);

  readonly promotion =
    signal<PromotionDto | null>(null);

  readonly sencillas =
    signal<PizzaDto[]>([]);

  readonly especiales =
    signal<PizzaDto[]>([]);

  readonly ingredients =
    signal<IngredientDto[]>([]);

  readonly quantity =
    signal(1);

  readonly selectedSizeId =
    signal<number | null>(null);

  readonly selectedBySlot =
    signal<
      Record<
        string,
        number | null
      >
    >({});

  readonly slotState =
    signal<
      Record<
        string,
        SlotCustomizationState
      >
    >({});

  readonly activeCustomizationKey =
    signal<string | null>(null);

  private readonly lockTokens = {
    sauceWords: [
      'pasta',
      'salsa',
    ],

    tomato: [
      'tomate',
    ],

    cheese: [
      'queso',
      'mozzarella',
      'mosarela',
    ],
  };

  readonly promotionType =
    computed<PromotionType>(
      () =>
        this.promotion()?.type ??
        'fixed_combo',
    );

  readonly isFixedCombo =
    computed(
      () =>
        this.promotionType() ===
        'fixed_combo',
    );

  readonly isSizeFixedPrice =
    computed(
      () =>
        this.promotionType() ===
        'size_fixed_price',
    );

  readonly requiresSizeSelection =
    computed(
      () =>
        this.promotion()
          ?.selection_rules
          ?.requires_size_selection ??
        this.isSizeFixedPrice(),
    );

  readonly allowsAnyCategory =
    computed(
      () =>
        this.promotion()
          ?.selection_rules
          ?.allows_any_category ??
        this.isSizeFixedPrice(),
    );

  readonly allPizzas =
    computed<PizzaDto[]>(() => {
      const byId =
        new Map<
          number,
          PizzaDto
        >();

      for (
        const pizza of [
          ...this.sencillas(),
          ...this.especiales(),
        ]
      ) {
        byId.set(
          pizza.id,
          pizza,
        );
      }

      return Array.from(
        byId.values(),
      ).sort(
        (
          first,
          second,
        ) =>
          first.name.localeCompare(
            second.name,
            'es',
          ),
      );
    });

  readonly sizePriceOptions =
    computed<
      SelectOption<number>[]
    >(
      () =>
        this.promotion()
          ?.size_prices
          ?.filter(
            item =>
              item.size !== null,
          )
          .map(item => ({
            label:
              `${
                item.size?.name ??
                'Tamaño'
              } · ${
                this.formatMoney(
                  item.price,
                )
              }`,

            value:
              item.size_id,
          })) ?? [],
    );

  readonly selectedSizePrice =
    computed<
      PromotionSizePriceDto | null
    >(() => {
      const sizeId =
        this.selectedSizeId();

      if (!sizeId) {
        return null;
      }

      return (
        this.promotion()
          ?.size_prices
          ?.find(
            item =>
              item.size_id ===
              sizeId,
          ) ??
        null
      );
    });

  readonly selectedSizeName =
    computed(() => {
      if (
        this.isFixedCombo()
      ) {
        return (
          this.promotion()
            ?.details?.[0]
            ?.size?.name ??
          '—'
        );
      }

      return (
        this.selectedSizePrice()
          ?.size?.name ??
        'Selecciona un tamaño'
      );
    });

  readonly selectedSizeIdForPricing =
    computed<
      number | null
    >(() => {
      if (
        this.isSizeFixedPrice()
      ) {
        return this.selectedSizeId();
      }

      return (
        this.promotion()
          ?.details?.[0]
          ?.size?.id ??
        null
      );
    });

  /**
   * Las reglas generales sí se toman desde la API,
   * excepto el máximo de extras, que se fuerza a cuatro
   * para mantener la regla real del negocio.
   */
  readonly selectionRules =
    computed(() => {
      const rules =
        this.promotion()
          ?.selection_rules;

      return {
        allows_extras:
          rules?.allows_extras ??
          true,

        allows_remove_ingredients:
          rules
            ?.allows_remove_ingredients ??
          true,

        allows_half_and_half:
          rules
            ?.allows_half_and_half ??
          false,

        allows_any_category:
          rules
            ?.allows_any_category ??
          false,

        requires_size_selection:
          rules
            ?.requires_size_selection ??
          false,

        selection_count:
          Number(
            rules?.selection_count ??
            1,
          ),

        max_extras_per_pizza:
          this.maxExtrasPerPizza,

        allow_duplicate_ingredients_as_extra:
          rules
            ?.allow_duplicate_ingredients_as_extra ??
          false,
      };
    });

  readonly slots =
    computed<
      PromotionSlot[]
    >(() => {
      const promotion =
        this.promotion();

      if (!promotion) {
        return [];
      }

      return this.buildSlotsFromPromotion(
        promotion,
      );
    });

  readonly configuredSlotsCount =
    computed(
      () =>
        this.slots().filter(
          slot =>
            Boolean(
              this.selectedBySlot()[
                slot.key
              ],
            ),
        ).length,
    );

  readonly selectionsComplete =
    computed(() => {
      const total =
        this.slots().length;

      return (
        total > 0 &&
        this.configuredSlotsCount() ===
          total
      );
    });

  readonly sizeSelectionComplete =
    computed(
      () =>
        !this.requiresSizeSelection() ||
        this.selectedSizeId() !==
          null,
    );

  readonly progressLabel =
    computed(() => {
      if (
        this.requiresSizeSelection() &&
        !this.selectedSizeId()
      ) {
        return (
          'Empieza seleccionando ' +
          'el tamaño de tu pizza.'
        );
      }

      const total =
        this.slots().length;

      const done =
        this.configuredSlotsCount();

      if (!total) {
        return (
          'Cargando promoción...'
        );
      }

      if (done === 0) {
        return this.isSizeFixedPrice()
          ? 'Ahora elige la pizza que deseas.'
          : 'Empieza eligiendo tus pizzas.';
      }

      if (done < total) {
        return (
          `Ya elegiste ${done} ` +
          `de ${total} pizzas.`
        );
      }

      return (
        'Perfecto, ahora puedes ' +
        'revisar y personalizar tu pedido.'
      );
    });

  /**
   * El payload también normaliza los extras.
   *
   * Esto impide que un estado antiguo, manipulado o inválido
   * envíe más de cuatro extras al carrito.
   */
  readonly selectedItemsPayload =
    computed(() =>
      this.slots()
        .map(slot => {
          const pizzaId =
            this.selectedBySlot()[
              slot.key
            ] ?? null;

          if (!pizzaId) {
            return null;
          }

          const state =
            this.getSlotState(
              slot,
            );

          return {
            pizza_id:
              pizzaId,

            customizations: [
              ...state
                .removedIngredientIds
                .map(
                  ingredientId => ({
                    action:
                      'remove' as const,

                    ingredient_id:
                      ingredientId,

                    applies_to:
                      'ALL' as const,
                  }),
                ),

              ...this
                .normalizeExtraIngredientIds(
                  state
                    .extraIngredientIds,
                )
                .map(
                  ingredientId => ({
                    action:
                      'extra' as const,

                    ingredient_id:
                      ingredientId,

                    applies_to:
                      'ALL' as const,
                  }),
                ),
            ],
          };
        })
        .filter(
          (
            item,
          ): item is NonNullable<
            typeof item
          > =>
            item !== null,
        ),
    );

  readonly promotionBasePrice =
    computed(() => {
      const promotion =
        this.promotion();

      if (!promotion) {
        return 0;
      }

      if (
        promotion.type ===
        'size_fixed_price'
      ) {
        return Number(
          this.selectedSizePrice()
            ?.price ??
          0,
        );
      }

      return Number(
        promotion.price ??
        0,
      );
    });

  readonly extrasPerUnitTotal =
    computed(
      () =>
        this.slots().reduce(
          (
            accumulated,
            slot,
          ) =>
            accumulated +
            this.slotExtrasTotal(
              slot,
            ),
          0,
        ),
    );

  readonly unitPrice =
    computed(
      () =>
        this.promotionBasePrice() +
        this.extrasPerUnitTotal(),
    );

  readonly total =
    computed(
      () =>
        this.unitPrice() *
        this.quantity(),
    );

  readonly canSubmit =
    computed(
      () =>
        Boolean(
          this.promotion(),
        ) &&
        this.sizeSelectionComplete() &&
        this.selectionsComplete() &&
        this
          .selectedItemsPayload()
          .length ===
          this.slots().length &&
        this.quantity() >= 1 &&
        this.quantity() <= 10 &&
        !this.submitting(),
    );

  constructor() {
    this.load();
  }

  private load(): void {
    const slug =
      (
        this.route.snapshot
          .paramMap
          .get('slug') ??
        ''
      ).trim();

    if (!slug) {
      this.error.set(
        'Promoción inválida.',
      );

      this.loading.set(
        false,
      );

      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      promotion:
        this.promotionApi
          .getPromotionBySlug(
            slug,
          ),

      sencillas:
        this.catalogApi
          .getPizzasSencillas(),

      especiales:
        this.catalogApi
          .getPizzasEspeciales(),

      ingredients:
        this.catalogApi
          .getIngredients(),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(
            false,
          );
        }),
      )
      .subscribe({
        next: ({
          promotion,
          sencillas,
          especiales,
          ingredients,
        }) => {
          this.promotion.set(
            promotion,
          );

          this.sencillas.set(
            sencillas ?? [],
          );

          this.especiales.set(
            especiales ?? [],
          );

          this.ingredients.set(
            ingredients ?? [],
          );

          this.quantity.set(1);

          this.initializePromotionState(
            promotion,
          );
        },

        error: (
          error: Error,
        ) => {
          this.error.set(
            error.message ||
            'No se pudo cargar la promoción.',
          );
        },
      });
  }

  private initializePromotionState(
    promotion: PromotionDto,
  ): void {
    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      const availablePrices =
        promotion.size_prices ??
        [];

      this.selectedSizeId.set(
        availablePrices.length ===
          1
          ? availablePrices[0]
              .size_id
          : null,
      );
    } else {
      this.selectedSizeId.set(
        null,
      );
    }

    this.resetSelections(
      promotion,
    );
  }

  private resetSelections(
    promotion:
      | PromotionDto
      | null =
      this.promotion(),
  ): void {
    if (!promotion) {
      this.selectedBySlot.set(
        {},
      );

      this.slotState.set(
        {},
      );

      this.activeCustomizationKey.set(
        null,
      );

      return;
    }

    const builtSlots =
      this.buildSlotsFromPromotion(
        promotion,
      );

    const selectedBySlot:
      Record<
        string,
        number | null
      > = {};

    const slotState:
      Record<
        string,
        SlotCustomizationState
      > = {};

    for (
      const slot of builtSlots
    ) {
      selectedBySlot[
        slot.key
      ] = null;

      slotState[
        slot.key
      ] = {
        removedIngredientIds:
          [],

        extraIngredientIds:
          [],
      };
    }

    this.selectedBySlot.set(
      selectedBySlot,
    );

    this.slotState.set(
      slotState,
    );

    this.activeCustomizationKey.set(
      null,
    );
  }

  private buildSlotsFromPromotion(
    promotion: PromotionDto,
  ): PromotionSlot[] {
    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      const selectionCount =
        Math.max(
          1,
          Number(
            promotion
              .selection_rules
              ?.selection_count ??
            1,
          ),
        );

      return Array.from(
        {
          length:
            selectionCount,
        },

        (
          _,
          index,
        ) => ({
          key:
            `any-${index + 1}`,

          index:
            index + 1,

          kind:
            'any' as const,

          title:
            selectionCount > 1
              ? `Elige la pizza ${index + 1}`
              : 'Elige tu pizza',

          shortTitle:
            selectionCount > 1
              ? `Pizza ${index + 1}`
              : 'Pizza seleccionada',

          helper:
            'Puedes escoger cualquier pizza sencilla o especial.',
        }),
      );
    }

    const details =
      promotion.details ??
      [];

    const built:
      PromotionSlot[] = [];

    let counter = 1;

    for (
      const detail of details
    ) {
      const quantity =
        Math.max(
          0,
          Number(
            detail
              .required_quantity ??
            0,
          ),
        );

      const categoryName =
        (
          detail.category
            ?.name ??
          ''
        ).toLocaleLowerCase(
          'es',
        );

      const kind:
        SlotKind =
        categoryName.includes(
          'especial',
        )
          ? 'especial'
          : 'sencilla';

      for (
        let index = 0;
        index < quantity;
        index++
      ) {
        built.push({
          key:
            `${kind}-${counter}-${index}`,

          index:
            counter,

          kind,

          title:
            kind ===
            'especial'
              ? 'Elige tu pizza especial'
              : 'Elige tu pizza sencilla',

          shortTitle:
            kind ===
            'especial'
              ? 'Pizza especial'
              : 'Pizza sencilla',

          helper:
            kind ===
            'especial'
              ? 'Selecciona una pizza especial para continuar.'
              : 'Selecciona una pizza sencilla para continuar.',
        });

        counter++;
      }
    }

    return built;
  }

  setQuantity(
    value:
      | number
      | null
      | undefined,
  ): void {
    const numericValue =
      Number(
        value ??
        1,
      );

    const safeValue =
      Math.max(
        1,
        Math.min(
          10,
          Math.trunc(
            numericValue ||
            1,
          ),
        ),
      );

    this.quantity.set(
      safeValue,
    );
  }

  onSelectSize(
    sizeId:
      | number
      | null
      | undefined,
  ): void {
    const normalizedSizeId =
      Number(
        sizeId ??
        0,
      );

    this.selectedSizeId.set(
      normalizedSizeId > 0
        ? normalizedSizeId
        : null,
    );

    /*
     * Se limpian las pizzas y personalizaciones al cambiar
     * de tamaño para no conservar precios calculados
     * con el tamaño anterior.
     */
    this.resetSelections();
  }

  optionsForSlot(
    slot: PromotionSlot,
  ): SelectOption<number>[] {
    let pizzas:
      PizzaDto[] = [];

    if (
      slot.kind ===
      'especial'
    ) {
      pizzas =
        this.especiales();
    } else if (
      slot.kind ===
      'sencilla'
    ) {
      pizzas =
        this.sencillas();
    } else {
      pizzas =
        this.allPizzas();
    }

    return pizzas.map(
      pizza => ({
        label:
          slot.kind ===
          'any'
            ? `${pizza.name} · ${pizza.category.name}`
            : pizza.name,

        value:
          pizza.id,
      }),
    );
  }

  pizzaPlaceholder(
    slot: PromotionSlot,
  ): string {
    if (
      slot.kind ===
      'especial'
    ) {
      return (
        'Selecciona una pizza especial'
      );
    }

    if (
      slot.kind ===
      'sencilla'
    ) {
      return (
        'Selecciona una pizza sencilla'
      );
    }

    return (
      'Selecciona cualquier pizza'
    );
  }

  onSelectPizza(
    slot: PromotionSlot,
    pizzaId:
      | number
      | null,
  ): void {
    const normalizedPizzaId =
      Number(
        pizzaId ??
        0,
      );

    const safePizzaId =
      normalizedPizzaId > 0
        ? normalizedPizzaId
        : null;

    const currentSelected = {
      ...this.selectedBySlot(),
    };

    currentSelected[
      slot.key
    ] = safePizzaId;

    this.selectedBySlot.set(
      currentSelected,
    );

    const currentState = {
      ...this.slotState(),
    };

    currentState[
      slot.key
    ] = {
      removedIngredientIds:
        [],

      extraIngredientIds:
        [],
    };

    this.slotState.set(
      currentState,
    );

    if (safePizzaId) {
      this.activeCustomizationKey.set(
        slot.key,
      );
    } else if (
      this.activeCustomizationKey() ===
      slot.key
    ) {
      this.activeCustomizationKey.set(
        null,
      );
    }
  }

  getSelectedPizza(
    slot: PromotionSlot,
  ): PizzaDto | null {
    const pizzaId =
      this.selectedBySlot()[
        slot.key
      ] ?? null;

    if (!pizzaId) {
      return null;
    }

    return (
      this.pizzasForSlot(
        slot,
      ).find(
        pizza =>
          pizza.id ===
          pizzaId,
      ) ??
      null
    );
  }

  private pizzasForSlot(
    slot: PromotionSlot,
  ): PizzaDto[] {
    if (
      slot.kind ===
      'especial'
    ) {
      return this.especiales();
    }

    if (
      slot.kind ===
      'sencilla'
    ) {
      return this.sencillas();
    }

    return this.allPizzas();
  }

  getSelectedSlots():
    PromotionSlot[] {
    return this.slots().filter(
      slot =>
        Boolean(
          this.selectedBySlot()[
            slot.key
          ],
        ),
    );
  }

  isCustomizationActive(
    slot: PromotionSlot,
  ): boolean {
    return (
      this.activeCustomizationKey() ===
      slot.key
    );
  }

  activateCustomization(
    slot: PromotionSlot,
  ): void {
    if (
      !this.getSelectedPizza(
        slot,
      )
    ) {
      return;
    }

    this.activeCustomizationKey.set(
      slot.key,
    );
  }

  getBaseIngredients(
    slot: PromotionSlot,
  ): PizzaIngredientDto[] {
    return (
      this.getSelectedPizza(
        slot,
      )?.ingredients ??
      []
    );
  }

  getVisibleBaseIngredients(
    slot: PromotionSlot,
  ): PizzaIngredientDto[] {
    const removedIds =
      new Set(
        this.getSlotState(
          slot,
        ).removedIngredientIds,
      );

    return this
      .getBaseIngredients(
        slot,
      )
      .filter(
        ingredient =>
          !removedIds.has(
            ingredient.id,
          ),
      );
  }

  getRemovedBaseIngredients(
    slot: PromotionSlot,
  ): PizzaIngredientDto[] {
    const removedIds =
      new Set(
        this.getSlotState(
          slot,
        ).removedIngredientIds,
      );

    return this
      .getBaseIngredients(
        slot,
      )
      .filter(
        ingredient =>
          removedIds.has(
            ingredient.id,
          ),
      );
  }

  canRemoveBaseIngredient(
    name: string,
  ): boolean {
    if (
      !this.selectionRules()
        .allows_remove_ingredients
    ) {
      return false;
    }

    return (
      !this.isBaseIngredientLocked(
        name,
      )
    );
  }

  removeBaseIngredient(
    slot: PromotionSlot,
    ingredient:
      PizzaIngredientDto,
  ): void {
    if (
      !this.canRemoveBaseIngredient(
        ingredient.name,
      )
    ) {
      return;
    }

    const current = {
      ...this.slotState(),
    };

    const state =
      this.copySlotState(
        slot,
      );

    if (
      !state
        .removedIngredientIds
        .includes(
          ingredient.id,
        )
    ) {
      state
        .removedIngredientIds = [
          ...state
            .removedIngredientIds,

          ingredient.id,
        ];
    }

    current[
      slot.key
    ] = state;

    this.slotState.set(
      current,
    );
  }

  restoreBaseIngredient(
    slot: PromotionSlot,
    ingredientId: number,
  ): void {
    const current = {
      ...this.slotState(),
    };

    const state =
      this.copySlotState(
        slot,
      );

    state
      .removedIngredientIds =
      state
        .removedIngredientIds
        .filter(
          id =>
            id !==
            ingredientId,
        );

    current[
      slot.key
    ] = state;

    this.slotState.set(
      current,
    );
  }

  isExtraSelected(
    slot: PromotionSlot,
    ingredientId: number,
  ): boolean {
    return this
      .getSlotState(
        slot,
      )
      .extraIngredientIds
      .includes(
        ingredientId,
      );
  }

  extraCount(
    slot: PromotionSlot,
  ): number {
    return this
      .normalizeExtraIngredientIds(
        this.getSlotState(
          slot,
        ).extraIngredientIds,
      )
      .length;
  }

  canAddMoreExtras(
    slot: PromotionSlot,
  ): boolean {
    return (
      this.extraCount(
        slot,
      ) <
      this.maxExtrasPerPizza
    );
  }

  /**
   * Agrega o elimina extras de forma inmutable.
   *
   * Incluye una validación interna del máximo, independientemente
   * de si el checkbox está disabled o fue manipulado externamente.
   */
  toggleExtra(
    slot: PromotionSlot,
    ingredientId: number,
    checked: boolean,
  ): void {
    const normalizedIngredientId =
      Number(
        ingredientId,
      );

    if (
      !Number.isFinite(
        normalizedIngredientId,
      ) ||
      normalizedIngredientId <=
        0
    ) {
      return;
    }

    const ingredient =
      this.ingredients().find(
        item =>
          item.id ===
          normalizedIngredientId,
      );

    if (!ingredient) {
      return;
    }

    const current = {
      ...this.slotState(),
    };

    const state =
      this.copySlotState(
        slot,
      );

    const selectedExtraIds =
      new Set(
        this
          .normalizeExtraIngredientIds(
            state.extraIngredientIds,
          ),
      );

    /*
     * Siempre se permite desmarcar un ingrediente seleccionado.
     */
    if (!checked) {
      selectedExtraIds.delete(
        normalizedIngredientId,
      );

      current[
        slot.key
      ] = {
        ...state,

        extraIngredientIds:
          Array.from(
            selectedExtraIds,
          ),
      };

      this.slotState.set(
        current,
      );

      return;
    }

    /*
     * No se agregan duplicados.
     */
    if (
      selectedExtraIds.has(
        normalizedIngredientId,
      )
    ) {
      return;
    }

    /*
     * Valida que el ingrediente pueda agregarse.
     */
    if (
      this.isExtraDisabled(
        slot,
        ingredient,
      )
    ) {
      return;
    }

    /*
     * Segunda barrera de seguridad:
     * máximo cuatro extras por pizza.
     */
    if (
      selectedExtraIds.size >=
      this.maxExtrasPerPizza
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Máximo de extras alcanzado',

        detail:
          `Puedes agregar hasta ${
            this.maxExtrasPerPizza
          } ingredientes extra por pizza.`,
      });

      return;
    }

    selectedExtraIds.add(
      normalizedIngredientId,
    );

    current[
      slot.key
    ] = {
      ...state,

      extraIngredientIds:
        Array.from(
          selectedExtraIds,
        ),
    };

    this.slotState.set(
      current,
    );
  }

  isExtraDisabled(
    slot: PromotionSlot,
    ingredient:
      IngredientDto,
  ): boolean {
    const pizza =
      this.getSelectedPizza(
        slot,
      );

    if (!pizza) {
      return true;
    }

    if (
      !this.selectionRules()
        .allows_extras
    ) {
      return true;
    }

    const ingredientId =
      Number(
        ingredient.id,
      );

    if (
      !Number.isFinite(
        ingredientId,
      ) ||
      ingredientId <= 0
    ) {
      return true;
    }

    /*
     * Un extra seleccionado permanece habilitado
     * para permitir que el usuario lo quite.
     */
    if (
      this.isExtraSelected(
        slot,
        ingredientId,
      )
    ) {
      return false;
    }

    const baseIngredientIds =
      new Set(
        this.getBaseIngredients(
          slot,
        ).map(
          item =>
            item.id,
        ),
      );

    const isBaseIngredient =
      baseIngredientIds.has(
        ingredientId,
      );

    if (
      isBaseIngredient &&
      !this.selectionRules()
        .allow_duplicate_ingredients_as_extra
    ) {
      return true;
    }

    return (
      this.extraCount(
        slot,
      ) >=
      this.maxExtrasPerPizza
    );
  }

  extraDisabledReason(
    slot: PromotionSlot,
    ingredient:
      IngredientDto,
  ): string | null {
    const pizza =
      this.getSelectedPizza(
        slot,
      );

    if (!pizza) {
      return (
        'Primero elige una pizza.'
      );
    }

    if (
      !this.selectionRules()
        .allows_extras
    ) {
      return (
        'Esta promoción no permite extras.'
      );
    }

    const ingredientId =
      Number(
        ingredient.id,
      );

    if (
      this.isExtraSelected(
        slot,
        ingredientId,
      )
    ) {
      return null;
    }

    const baseIngredientIds =
      new Set(
        this.getBaseIngredients(
          slot,
        ).map(
          item =>
            item.id,
        ),
      );

    if (
      baseIngredientIds.has(
        ingredientId,
      ) &&
      !this.selectionRules()
        .allow_duplicate_ingredients_as_extra
    ) {
      return (
        'Este ingrediente ya viene incluido.'
      );
    }

    if (
      !this.canAddMoreExtras(
        slot,
      )
    ) {
      return (
        `Máximo ${
          this.maxExtrasPerPizza
        } extras por pizza.`
      );
    }

    return null;
  }

  extraPriceValue(
    ingredientId: number,
  ): number {
    const sizeId =
      this.selectedSizeIdForPricing();

    const ingredient =
      this.ingredients().find(
        item =>
          item.id ===
          ingredientId,
      );

    if (
      !sizeId ||
      !ingredient
    ) {
      return 0;
    }

    const found =
      ingredient
        .extra_prices
        ?.find(
          item =>
            item.size.id ===
            sizeId,
        );

    return Number(
      found?.extra_price ??
      0,
    );
  }

  extraPriceLabel(
    ingredientId: number,
  ): string {
    return this.formatMoney(
      this.extraPriceValue(
        ingredientId,
      ),
    );
  }

  /**
   * Calcula únicamente los primeros cuatro extras válidos.
   */
  slotExtrasTotal(
    slot: PromotionSlot,
  ): number {
    return this
      .normalizeExtraIngredientIds(
        this.getSlotState(
          slot,
        ).extraIngredientIds,
      )
      .reduce(
        (
          accumulated,
          ingredientId,
        ) =>
          accumulated +
          this.extraPriceValue(
            ingredientId,
          ),
        0,
      );
  }

  selectedExtraIngredients(
    slot: PromotionSlot,
  ): IngredientDto[] {
    const selectedIds =
      new Set(
        this
          .normalizeExtraIngredientIds(
            this.getSlotState(
              slot,
            ).extraIngredientIds,
          ),
      );

    return this
      .ingredients()
      .filter(
        ingredient =>
          selectedIds.has(
            ingredient.id,
          ),
      );
  }

  removeExtra(
    slot: PromotionSlot,
    ingredientId: number,
  ): void {
    const current = {
      ...this.slotState(),
    };

    const state =
      this.copySlotState(
        slot,
      );

    state.extraIngredientIds =
      this
        .normalizeExtraIngredientIds(
          state.extraIngredientIds,
        )
        .filter(
          id =>
            id !==
            ingredientId,
        );

    current[
      slot.key
    ] = state;

    this.slotState.set(
      current,
    );
  }

  resetSlot(
    slot: PromotionSlot,
  ): void {
    const current = {
      ...this.slotState(),
    };

    current[
      slot.key
    ] = {
      removedIngredientIds:
        [],

      extraIngredientIds:
        [],
    };

    this.slotState.set(
      current,
    );
  }

  slotSummary(
    slot: PromotionSlot,
  ): string {
    const pizza =
      this.getSelectedPizza(
        slot,
      );

    if (!pizza) {
      return (
        'Aún no la has elegido'
      );
    }

    const removed =
      this
        .getRemovedBaseIngredients(
          slot,
        )
        .length;

    const extras =
      this.extraCount(
        slot,
      );

    const parts = [
      pizza.name,
    ];

    if (removed > 0) {
      parts.push(
        `sin ${removed} ingrediente${
          removed === 1
            ? ''
            : 's'
        }`,
      );
    }

    if (extras > 0) {
      parts.push(
        `${extras} extra${
          extras === 1
            ? ''
            : 's'
        }`,
      );
    }

    return parts.join(
      ' • ',
    );
  }

  addPromotionToCart(): void {
    const promotion =
      this.promotion();

    if (!promotion) {
      return;
    }

    if (
      !this.sizeSelectionComplete()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Selecciona un tamaño',

        detail:
          'Debes elegir el tamaño antes de continuar.',
      });

      return;
    }

    if (
      !this.canSubmit()
    ) {
      this.messageService.add({
        severity:
          'warn',

        summary:
          'Falta completar tu pedido',

        detail:
          'Primero elige todas las pizzas de la promoción.',
      });

      return;
    }

    const payload:
      CartAddPromotionRequestDto = {
      promotion_id:
        promotion.id,

      quantity:
        this.quantity(),

      selected_items:
        this.selectedItemsPayload(),
    };

    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      const sizeId =
        this.selectedSizeId();

      if (!sizeId) {
        return;
      }

      payload.size_id =
        sizeId;
    }

    this.submitting.set(
      true,
    );

    this.cart
      .addPromotion(
        payload,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: () => {
          this.submitting.set(
            false,
          );

          this.messageService.add({
            severity:
              'success',

            summary:
              '¡Listo!',

            detail:
              'Tu promoción se agregó correctamente al carrito.',
          });
        },

        error: (
          error: {
            error?: {
              message?: string;
            };

            message?: string;
          },
        ) => {
          this.submitting.set(
            false,
          );

          this.messageService.add({
            severity:
              'error',

            summary:
              'No se pudo agregar',

            detail:
              error
                ?.error
                ?.message ||
              error?.message ||
              'Ocurrió un error al agregar la promoción.',
          });
        },
      });
  }

  goCheckout(): void {
    void this.router.navigate([
      '/checkout',
    ]);
  }

  goHome(): void {
    void this.router.navigate([
      '/',
    ]);
  }

  /**
   * Devuelve siempre un estado normalizado.
   *
   * Si por cualquier motivo existen ocho extras en memoria,
   * solo se conservarán los primeros cuatro válidos para:
   *
   * - contadores;
   * - resumen;
   * - cálculo de precio;
   * - checkboxes;
   * - payload enviado al carrito.
   */
  private getSlotState(
    slot: PromotionSlot,
  ): SlotCustomizationState {
    const state =
      this.slotState()[
        slot.key
      ] ?? {
        removedIngredientIds:
          [],

        extraIngredientIds:
          [],
      };

    return {
      removedIngredientIds:
        this.normalizeIngredientIds(
          state
            .removedIngredientIds,
        ),

      extraIngredientIds:
        this.normalizeExtraIngredientIds(
          state
            .extraIngredientIds,
        ),
    };
  }

  private copySlotState(
    slot: PromotionSlot,
  ): SlotCustomizationState {
    const current =
      this.getSlotState(
        slot,
      );

    return {
      removedIngredientIds: [
        ...current
          .removedIngredientIds,
      ],

      extraIngredientIds: [
        ...current
          .extraIngredientIds,
      ],
    };
  }

  /**
   * Normaliza IDs para impedir duplicados, valores inválidos,
   * ceros, negativos o strings convertidos incorrectamente.
   */
  private normalizeIngredientIds(
    ingredientIds:
      | number[]
      | null
      | undefined,
  ): number[] {
    return Array.from(
      new Set(
        (
          ingredientIds ??
          []
        )
          .map(
            id =>
              Number(id),
          )
          .filter(
            id =>
              Number.isFinite(
                id,
              ) &&
              id > 0,
          ),
      ),
    );
  }

  /**
   * Aplica definitivamente el límite de cuatro extras.
   */
  private normalizeExtraIngredientIds(
    ingredientIds:
      | number[]
      | null
      | undefined,
  ): number[] {
    return this
      .normalizeIngredientIds(
        ingredientIds,
      )
      .slice(
        0,
        this.maxExtrasPerPizza,
      );
  }

  private isBaseIngredientLocked(
    name: string,
  ): boolean {
    const normalized =
      this.normalizeText(
        name,
      );

    const isCheese =
      this.lockTokens
        .cheese
        .some(
          token =>
            normalized.includes(
              token,
            ),
        );

    const hasTomato =
      this.lockTokens
        .tomato
        .some(
          token =>
            normalized.includes(
              token,
            ),
        );

    const hasSauceWord =
      this.lockTokens
        .sauceWords
        .some(
          token =>
            normalized.includes(
              token,
            ),
        );

    const isSauce =
      hasTomato &&
      hasSauceWord;

    return (
      isCheese ||
      isSauce
    );
  }

  private normalizeText(
    value: string,
  ): string {
    return (
      value ??
      ''
    )
      .toLocaleLowerCase(
        'es',
      )
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .trim();
  }

  private formatMoney(
    value:
      | number
      | string
      | null
      | undefined,
  ): string {
    const numericValue =
      Number(
        value ??
        0,
      );

    return new Intl.NumberFormat(
      'es-EC',
      {
        style:
          'currency',

        currency:
          'USD',

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2,
      },
    ).format(
      Number.isFinite(
        numericValue,
      )
        ? numericValue
        : 0,
    );
  }
}
