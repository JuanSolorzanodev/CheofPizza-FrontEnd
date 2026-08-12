import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';

import {
  FormsModule,
} from '@angular/forms';

import {
  InputNumberModule,
} from 'primeng/inputnumber';

import {
  SelectModule,
} from 'primeng/select';

import {
  PizzaDto,
} from '../../../core/api/catalog/catalog.models';

export type PromotionPizzaSlotKind =
  | 'especial'
  | 'sencilla'
  | 'any';

export interface PromotionPizzaSlot {
  key: string;
  index: number;
  kind: PromotionPizzaSlotKind;
  title: string;
  shortTitle: string;
  helper: string;
}

export interface PromotionPizzaSelectionChange {
  slotKey: string;
  pizzaId: number | null;
}

interface PromotionPizzaOption {
  label: string;
  value: number;
}

@Component({
  selector:
    'app-promotion-pizza-selector',

  standalone:
    true,

  imports: [
    FormsModule,
    InputNumberModule,
    SelectModule,
  ],

  templateUrl:
    './promotion-pizza-selector.html',

  styleUrl:
    './promotion-pizza-selector.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class PromotionPizzaSelectorComponent {
  readonly slots =
    input.required<
      readonly PromotionPizzaSlot[]
    >();

  readonly selectedBySlot =
    input.required<
      Readonly<
        Record<
          string,
          number | null
        >
      >
    >();

  readonly sencillas =
    input.required<
      readonly PizzaDto[]
    >();

  readonly especiales =
    input.required<
      readonly PizzaDto[]
    >();

  readonly quantity =
    input.required<number>();

  readonly requiresSizeSelection =
    input(false);

  readonly selectedSizeId =
    input<number | null>(
      null,
    );

  readonly selectedSizeName =
    input<string | null>(
      null,
    );

  readonly stepNumber =
    input(1);

  readonly quantityChange =
    output<number>();

  readonly pizzaChange =
    output<
      PromotionPizzaSelectionChange
    >();

  readonly customize =
    output<string>();

  readonly allPizzas =
    computed<
      readonly PizzaDto[]
    >(() => {
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
            {
              sensitivity:
                'base',
            },
          ),
      );
    });

  readonly isLocked =
    computed(
      () =>
        this.requiresSizeSelection() &&
        this.selectedSizeId() ===
          null,
    );

  readonly configuredCount =
    computed(
      () =>
        this.slots().filter(
          (slot) =>
            Boolean(
              this.selectedBySlot()[
                slot.key
              ],
            ),
        ).length,
    );

  protected onQuantityChange(
    value:
      number |
      null |
      undefined,
  ): void {
    const numericValue =
      Number(
        value ?? 1,
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

    this.quantityChange.emit(
      safeValue,
    );
  }

  protected onPizzaChange(
    slot:
      PromotionPizzaSlot,
    value:
      number |
      null |
      undefined,
  ): void {
    const numericValue =
      Number(
        value ?? 0,
      );

    this.pizzaChange.emit({
      slotKey:
        slot.key,

      pizzaId:
        numericValue > 0
          ? numericValue
          : null,
    });
  }

  protected onCustomize(
    slotKey:
      string,
  ): void {
    if (
      !this.selectedBySlot()[
        slotKey
      ]
    ) {
      return;
    }

    this.customize.emit(
      slotKey,
    );
  }

  protected optionsForSlot(
    slot:
      PromotionPizzaSlot,
  ): PromotionPizzaOption[] {
    return this.pizzasForSlot(
      slot,
    ).map(
      (pizza) => ({
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

  protected placeholderForSlot(
    slot:
      PromotionPizzaSlot,
  ): string {
    switch (
      slot.kind
    ) {
      case 'especial':
        return 'Selecciona una pizza especial';

      case 'sencilla':
        return 'Selecciona una pizza sencilla';

      default:
        return 'Selecciona cualquier pizza';
    }
  }

  protected selectedPizza(
    slot:
      PromotionPizzaSlot,
  ): PizzaDto | null {
    const pizzaId =
      this.selectedBySlot()[
        slot.key
      ];

    if (!pizzaId) {
      return null;
    }

    return (
      this.pizzasForSlot(
        slot,
      ).find(
        (pizza) =>
          pizza.id ===
          pizzaId,
      ) ?? null
    );
  }

  protected isCompleted(
    slot:
      PromotionPizzaSlot,
  ): boolean {
    return Boolean(
      this.selectedBySlot()[
        slot.key
      ],
    );
  }

  private pizzasForSlot(
    slot:
      PromotionPizzaSlot,
  ): readonly PizzaDto[] {
    switch (
      slot.kind
    ) {
      case 'especial':
        return this.especiales();

      case 'sencilla':
        return this.sencillas();

      default:
        return this.allPizzas();
    }
  }
}
