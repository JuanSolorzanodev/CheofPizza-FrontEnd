import {
  CommonModule,
} from '@angular/common';
import {
  HttpErrorResponse,
} from '@angular/common/http';
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
  finalize,
  forkJoin,
} from 'rxjs';

import {
  ConfirmationService,
  MessageService,
} from 'primeng/api';
import {
  ButtonModule,
} from 'primeng/button';
import {
  ConfirmDialogModule,
} from 'primeng/confirmdialog';
import {
  InputNumberModule,
} from 'primeng/inputnumber';
import {
  MessageModule,
} from 'primeng/message';
import {
  SkeletonModule,
} from 'primeng/skeleton';
import {
  TagModule,
} from 'primeng/tag';
import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  AdminCatalogApiService,
} from '../../../core/api/admin/catalog/admin-catalog-api.service';

import {
  AdminCategory,
  AdminCategoryPricePayload,
  AdminCategorySizePrice,
  AdminSize,
  AdminValidationErrorResponse,
} from '../../../core/api/admin/catalog/admin-catalog.models';

interface PriceCell {
  categoryId: number;
  sizeId: number;
  originalPrice: number;
  currentPrice: number;
}

@Component({
  selector: 'app-admin-prices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputNumberModule,
    MessageModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  providers: [
    ConfirmationService,
  ],
  templateUrl:
    './admin-prices.html',
  styleUrl:
    './admin-prices.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminPrices {
  private readonly api =
    inject(AdminCatalogApiService);

  private readonly messages =
    inject(MessageService);

  private readonly confirmation =
    inject(ConfirmationService);

  private readonly destroyRef =
    inject(DestroyRef);

  readonly loading =
    signal(true);

  readonly refreshing =
    signal(false);

  readonly saving =
    signal(false);

  readonly categories =
    signal<AdminCategory[]>([]);

  readonly sizes =
    signal<AdminSize[]>([]);

  readonly cells =
    signal<
      Record<string, PriceCell>
    >({});

  readonly changedKeys =
    signal<Set<string>>(
      new Set<string>(),
    );

  readonly hasChanges =
    computed(
      () =>
        this.changedKeys().size > 0,
    );

  readonly changedCount =
    computed(
      () =>
        this.changedKeys().size,
    );

  readonly totalCombinations =
    computed(
      () =>
        this.categories().length *
        this.sizes().length,
    );

  readonly activePricesCount =
    computed(() =>
      Object.values(
        this.cells(),
      ).filter(
        cell =>
          Number(
            cell.currentPrice,
          ) > 0,
      ).length,
    );

  readonly unavailableCount =
    computed(
      () =>
        Math.max(
          0,
          this.totalCombinations() -
            this.activePricesCount(),
        ),
    );

  constructor() {
    this.loadData();
  }

  loadData(
    showLoading = true,
  ): void {
    if (showLoading) {
      this.loading.set(true);
    }

    forkJoin({
      categories:
        this.api.categories(),

      sizes:
        this.api.sizes(),

      prices:
        this.api.prices(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          const categories =
            response.categories.data ??
            [];

          const sizes =
            response.sizes.data ??
            [];

          const prices =
            response.prices.data ??
            [];

          this.categories.set(
            categories,
          );

          this.sizes.set(sizes);

          this.buildCells(
            categories,
            sizes,
            prices,
          );
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',

            summary:
              'No se cargaron los precios',

            detail:
              this.errorMessage(
                error,
              ),

            life: 4000,
          });
        },
      });
  }

  refresh(): void {
    if (
      this.refreshing() ||
      this.saving()
    ) {
      return;
    }

    if (this.hasChanges()) {
      this.confirmation.confirm({
        header:
          'Descartar cambios',

        message:
          'Existen cambios pendientes. ¿Deseas descartarlos y volver a cargar los datos guardados?',

        icon:
          'pi pi-exclamation-triangle',

        acceptLabel:
          'Descartar y actualizar',

        rejectLabel:
          'Continuar editando',

        acceptButtonProps: {
          severity: 'danger',
        },

        rejectButtonProps: {
          severity: 'secondary',
          outlined: true,
        },

        accept: () => {
          this.refreshing.set(true);
          this.loadData(false);
        },
      });

      return;
    }

    this.refreshing.set(true);
    this.loadData(false);
  }

  cellKey(
    categoryId: number,
    sizeId: number,
  ): string {
    return `${categoryId}:${sizeId}`;
  }

  priceValue(
    categoryId: number,
    sizeId: number,
  ): number {
    const key =
      this.cellKey(
        categoryId,
        sizeId,
      );

    return (
      this.cells()[key]
        ?.currentPrice ?? 0
    );
  }

  originalPrice(
    categoryId: number,
    sizeId: number,
  ): number {
    const key =
      this.cellKey(
        categoryId,
        sizeId,
      );

    return (
      this.cells()[key]
        ?.originalPrice ?? 0
    );
  }

  updatePrice(
    categoryId: number,
    sizeId: number,
    value:
      | number
      | string
      | null,
  ): void {
    const key =
      this.cellKey(
        categoryId,
        sizeId,
      );

    const currentCell =
      this.cells()[key];

    if (!currentCell) {
      return;
    }

    const numericValue =
      this.normalizePrice(value);

    const updatedCell:
      PriceCell = {
        ...currentCell,
        currentPrice:
          numericValue,
      };

    this.cells.update(
      cells => ({
        ...cells,
        [key]: updatedCell,
      }),
    );

    this.changedKeys.update(
      keys => {
        const next =
          new Set(keys);

        if (
          this.samePrice(
            numericValue,
            currentCell.originalPrice,
          )
        ) {
          next.delete(key);
        } else {
          next.add(key);
        }

        return next;
      },
    );
  }

  isChanged(
    categoryId: number,
    sizeId: number,
  ): boolean {
    return this.changedKeys().has(
      this.cellKey(
        categoryId,
        sizeId,
      ),
    );
  }

  isAvailable(
    categoryId: number,
    sizeId: number,
  ): boolean {
    return (
      this.priceValue(
        categoryId,
        sizeId,
      ) > 0
    );
  }

  resetCell(
    categoryId: number,
    sizeId: number,
  ): void {
    const key =
      this.cellKey(
        categoryId,
        sizeId,
      );

    const cell =
      this.cells()[key];

    if (!cell) {
      return;
    }

    this.cells.update(
      cells => ({
        ...cells,
        [key]: {
          ...cell,
          currentPrice:
            cell.originalPrice,
        },
      }),
    );

    this.changedKeys.update(
      keys => {
        const next =
          new Set(keys);

        next.delete(key);

        return next;
      },
    );
  }

  resetAll(): void {
    if (!this.hasChanges()) {
      return;
    }

    this.confirmation.confirm({
      header:
        'Restaurar precios',

      message:
        'Se descartarán todos los cambios realizados en la matriz.',

      icon:
        'pi pi-undo',

      acceptLabel:
        'Restaurar',

      rejectLabel:
        'Cancelar',

      acceptButtonProps: {
        severity: 'danger',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () => {
        this.cells.update(
          cells => {
            const restored:
              Record<
                string,
                PriceCell
              > = {};

            for (
              const [
                key,
                cell,
              ] of Object.entries(
                cells,
              )
            ) {
              restored[key] = {
                ...cell,
                currentPrice:
                  cell.originalPrice,
              };
            }

            return restored;
          },
        );

        this.changedKeys.set(
          new Set<string>(),
        );
      },
    });
  }

  confirmSave(): void {
    if (
      !this.hasChanges() ||
      this.saving()
    ) {
      return;
    }

    const disabledCount =
      Array.from(
        this.changedKeys(),
      ).filter(
        key =>
          this.cells()[key]
            ?.currentPrice === 0,
      ).length;

    const enabledCount =
      this.changedCount() -
      disabledCount;

    const messageParts = [
      `Se actualizarán ${this.changedCount()} combinaciones.`,
    ];

    if (enabledCount > 0) {
      messageParts.push(
        `${enabledCount} quedarán disponibles.`,
      );
    }

    if (disabledCount > 0) {
      messageParts.push(
        `${disabledCount} quedarán no disponibles.`,
      );
    }

    this.confirmation.confirm({
      header:
        'Guardar precios',

      message:
        messageParts.join(' '),

      icon:
        'pi pi-dollar',

      acceptLabel:
        'Guardar cambios',

      rejectLabel:
        'Cancelar',

      acceptButtonProps: {
        severity: 'success',
      },

      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },

      accept: () =>
        this.saveChanges(),
    });
  }

  money(
    value: number,
  ): string {
    return new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value ?? 0),
    );
  }

  private saveChanges(): void {
    const changedKeys =
      Array.from(
        this.changedKeys(),
      );

    const prices:
      AdminCategoryPricePayload[] =
      changedKeys
        .map(
          key => this.cells()[key],
        )
        .filter(
          (
            cell,
          ): cell is PriceCell =>
            !!cell,
        )
        .map(
          cell => ({
            category_id:
              cell.categoryId,

            size_id:
              cell.sizeId,

            price:
              this.normalizePrice(
                cell.currentPrice,
              ),
          }),
        );

    if (!prices.length) {
      return;
    }

    this.saving.set(true);

    this.api
      .updatePrices({
        prices,
      })
      .pipe(
        finalize(() =>
          this.saving.set(false),
        ),

        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: response => {
          this.applySavedPrices(
            response.data ?? [],
          );

          this.messages.add({
            severity: 'success',

            summary:
              'Precios actualizados',

            detail:
              response.message,

            life: 3200,
          });
        },

        error: (
          error:
            HttpErrorResponse,
        ) => {
          this.messages.add({
            severity: 'error',

            summary:
              'No se guardaron los precios',

            detail:
              this.errorMessage(
                error,
              ),

            life: 4500,
          });
        },
      });
  }

  private buildCells(
    categories:
      AdminCategory[],

    sizes:
      AdminSize[],

    prices:
      AdminCategorySizePrice[],
  ): void {
    const priceMap =
      new Map<
        string,
        number
      >();

    for (
      const price
      of prices
    ) {
      priceMap.set(
        this.cellKey(
          price.category_id,
          price.size_id,
        ),
        this.normalizePrice(
          price.price,
        ),
      );
    }

    const cells:
      Record<
        string,
        PriceCell
      > = {};

    for (
      const category
      of categories
    ) {
      for (
        const size
        of sizes
      ) {
        const key =
          this.cellKey(
            category.id,
            size.id,
          );

        const price =
          priceMap.get(key) ??
          0;

        cells[key] = {
          categoryId:
            category.id,

          sizeId:
            size.id,

          originalPrice:
            price,

          currentPrice:
            price,
        };
      }
    }

    this.cells.set(cells);

    this.changedKeys.set(
      new Set<string>(),
    );
  }

  private applySavedPrices(
    prices:
      AdminCategorySizePrice[],
  ): void {
    const savedMap =
      new Map<
        string,
        number
      >();

    for (
      const price
      of prices
    ) {
      savedMap.set(
        this.cellKey(
          price.category_id,
          price.size_id,
        ),
        this.normalizePrice(
          price.price,
        ),
      );
    }

    this.cells.update(
      cells => {
        const updated:
          Record<
            string,
            PriceCell
          > = {};

        for (
          const [
            key,
            cell,
          ] of Object.entries(
            cells,
          )
        ) {
          const savedPrice =
            savedMap.get(key) ??
            0;

          updated[key] = {
            ...cell,

            originalPrice:
              savedPrice,

            currentPrice:
              savedPrice,
          };
        }

        return updated;
      },
    );

    this.changedKeys.set(
      new Set<string>(),
    );
  }

  private normalizePrice(
    value:
      | number
      | string
      | null
      | undefined,
  ): number {
    const numeric =
      Number(value ?? 0);

    if (
      !Number.isFinite(numeric) ||
      numeric < 0
    ) {
      return 0;
    }

    return Math.round(
      numeric * 100,
    ) / 100;
  }

  private samePrice(
    first: number,
    second: number,
  ): boolean {
    return (
      Math.abs(
        first - second,
      ) < 0.001
    );
  }

  private errorMessage(
    error: HttpErrorResponse,
  ): string {
    const body =
      error.error as
        | AdminValidationErrorResponse
        | string
        | null;

    if (
      typeof body === 'string' &&
      body.trim()
    ) {
      return body;
    }

    if (
      body &&
      typeof body === 'object'
    ) {
      const first =
        Object.values(
          body.errors ?? {},
        )
          .flat()
          .find(Boolean);

      return (
        first ??
        body.message ??
        'Ocurrió un problema procesando la solicitud.'
      );
    }

    return (
      error.message ||
      'Ocurrió un problema procesando la solicitud.'
    );
  }
}
