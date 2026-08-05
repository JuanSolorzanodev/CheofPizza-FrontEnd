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
  Router,
} from '@angular/router';

import {
  finalize,
} from 'rxjs';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  CatalogApiService,
} from '../../../core/api/catalog/catalog-api.service';

import {
  CategorySizePriceDto,
  PizzaDto,
} from '../../../core/api/catalog/catalog.models';

type CatalogSectionKind =
  | 'simple'
  | 'special';

interface PizzaSizeViewModel {
  id: number;
  name: string;
  price: number;
  formattedPrice: string;
}

interface PizzaCardViewModel {
  id: number;
  name: string;
  routeName: string;
  categoryName: string;
  categoryKind: CatalogSectionKind;
  description: string;
  imageUrl: string;
  formattedMinimumPrice: string | null;
  visibleSizes: PizzaSizeViewModel[];
  remainingSizes: number;
}

interface CatalogSectionViewModel {
  id: string;
  kind: CatalogSectionKind;
  eyebrow: string;
  title: string;
  description: string;
  pizzas: PizzaCardViewModel[];
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    SkeletonModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class Menu {
  private readonly catalogApi =
    inject(CatalogApiService);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly currencyFormatter =
    new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    );

  readonly simplePizzas =
    signal<PizzaCardViewModel[]>([]);

  readonly specialPizzas =
    signal<PizzaCardViewModel[]>([]);

  readonly simpleLoading =
    signal(true);

  readonly specialLoading =
    signal(true);

  readonly simpleError =
    signal<string | null>(null);

  readonly specialError =
    signal<string | null>(null);

  readonly orderingPizzaId =
    signal<number | null>(null);

  readonly skeletonItems =
    [0, 1, 2, 3, 4, 5];

  readonly sections =
    computed<CatalogSectionViewModel[]>(
      () => [
        {
          id: 'menu-sencillas',
          kind: 'simple',
          eyebrow: 'Sabores clásicos',
          title: 'Pizzas sencillas',
          description:
            'Recetas tradicionales preparadas con ingredientes frescos y combinaciones para cualquier ocasión.',
          pizzas:
            this.simplePizzas(),
          loading:
            this.simpleLoading(),
          error:
            this.simpleError(),
        },
        {
          id: 'menu-especiales',
          kind: 'special',
          eyebrow: 'Recetas de la casa',
          title: 'Pizzas especiales',
          description:
            'Combinaciones con más carácter, sabores intensos y el toque especial de Cheo’ Pizza.',
          pizzas:
            this.specialPizzas(),
          loading:
            this.specialLoading(),
          error:
            this.specialError(),
        },
      ],
    );

  readonly fallbackImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 900 650"
      >
        <defs>
          <radialGradient id="surface" cx="50%" cy="45%" r="68%">
            <stop offset="0%" stop-color="#f3f6f1"/>
            <stop offset="100%" stop-color="#dfe7df"/>
          </radialGradient>

          <radialGradient id="crust" cx="44%" cy="36%" r="68%">
            <stop offset="0%" stop-color="#f4d98f"/>
            <stop offset="76%" stop-color="#d99c42"/>
            <stop offset="100%" stop-color="#ae6c29"/>
          </radialGradient>
        </defs>

        <rect width="900" height="650" fill="url(#surface)"/>

        <ellipse
          cx="450"
          cy="522"
          rx="220"
          ry="30"
          fill="#163820"
          opacity=".14"
        />

        <circle
          cx="450"
          cy="310"
          r="190"
          fill="url(#crust)"
        />

        <circle
          cx="450"
          cy="310"
          r="164"
          fill="#f1d592"
        />

        <circle cx="385" cy="255" r="22" fill="#ba4438"/>
        <circle cx="510" cy="235" r="21" fill="#ba4438"/>
        <circle cx="548" cy="355" r="24" fill="#ba4438"/>
        <circle cx="374" cy="390" r="21" fill="#ba4438"/>

        <path
          d="M425 190c24 5 39 23 39 46-27 9-53 0-68-23 5-14 16-22 29-23z"
          fill="#5e8a50"
        />

        <path
          d="M495 410c20-9 42-4 57 11-10 26-31 41-58 42-10-17-10-35 1-53z"
          fill="#5e8a50"
        />

        <text
          x="450"
          y="585"
          text-anchor="middle"
          fill="#405247"
          font-family="Arial, sans-serif"
          font-size="26"
          font-weight="700"
        >
          Imagen no disponible
        </text>
      </svg>
    `);

  constructor() {
    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loadSimplePizzas();
    this.loadSpecialPizzas();
  }

  reloadSection(
    kind: CatalogSectionKind,
  ): void {
    if (kind === 'simple') {
      this.loadSimplePizzas();

      return;
    }

    this.loadSpecialPizzas();
  }

  onImageError(
    event: Event,
  ): void {
    const image =
      event.target as HTMLImageElement;

    if (
      image.dataset['fallbackApplied'] ===
      'true'
    ) {
      return;
    }

    image.dataset['fallbackApplied'] =
      'true';

    image.src =
      this.fallbackImage;
  }

  async personalize(
    pizza: PizzaCardViewModel,
  ): Promise<void> {
    if (
      this.orderingPizzaId() !== null
    ) {
      return;
    }

    this.orderingPizzaId.set(
      pizza.id,
    );

    try {
      await this.router.navigate([
        '/builder',
        pizza.routeName,
      ]);
    } finally {
      this.orderingPizzaId.set(
        null,
      );
    }
  }

  private loadSimplePizzas(): void {
    this.simpleLoading.set(true);
    this.simpleError.set(null);

    this.catalogApi
      .getPizzasSencillas()
      .pipe(
        finalize(() => {
          this.simpleLoading.set(false);
        }),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: pizzas => {
          this.simplePizzas.set(
            this.mapPizzas(
              pizzas,
              'simple',
            ),
          );
        },

        error: (
          error: Error,
        ) => {
          this.simplePizzas.set([]);

          this.simpleError.set(
            error.message ||
              'No se pudieron cargar las pizzas sencillas.',
          );
        },
      });
  }

  private loadSpecialPizzas(): void {
    this.specialLoading.set(true);
    this.specialError.set(null);

    this.catalogApi
      .getPizzasEspeciales()
      .pipe(
        finalize(() => {
          this.specialLoading.set(false);
        }),
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: pizzas => {
          this.specialPizzas.set(
            this.mapPizzas(
              pizzas,
              'special',
            ),
          );
        },

        error: (
          error: Error,
        ) => {
          this.specialPizzas.set([]);

          this.specialError.set(
            error.message ||
              'No se pudieron cargar las pizzas especiales.',
          );
        },
      });
  }

  private mapPizzas(
    pizzas: PizzaDto[],
    kind: CatalogSectionKind,
  ): PizzaCardViewModel[] {
    return [...pizzas]
      .sort(
        (
          first,
          second,
        ) =>
          first.name.localeCompare(
            second.name,
            'es',
            {
              sensitivity: 'base',
            },
          ),
      )
      .map(pizza =>
        this.mapPizza(
          pizza,
          kind,
        ),
      );
  }

  private mapPizza(
    pizza: PizzaDto,
    kind: CatalogSectionKind,
  ): PizzaCardViewModel {
    const sizes =
      this.normalizeSizes(
        pizza.category?.size_prices ??
          [],
      );

    const minimumPrice =
      sizes.length > 0
        ? sizes[0].price
        : null;

    return {
      id:
        pizza.id,

      name:
        pizza.name.trim(),

      routeName:
        pizza.name,

      categoryName:
        pizza.category?.name?.trim() ||
        (
          kind === 'simple'
            ? 'Sencilla'
            : 'Especial'
        ),

      categoryKind:
        kind,

      description:
        this.resolveDescription(
          pizza,
        ),

      imageUrl:
        pizza.image_url?.trim() ||
        this.fallbackImage,

      formattedMinimumPrice:
        minimumPrice === null
          ? null
          : this.currencyFormatter.format(
              minimumPrice,
            ),

      visibleSizes:
        sizes.slice(0, 3),

      remainingSizes:
        Math.max(
          0,
          sizes.length - 3,
        ),
    };
  }

  private normalizeSizes(
    prices: CategorySizePriceDto[],
  ): PizzaSizeViewModel[] {
    return prices
      .map(item => {
        const price =
          Number(item.price);

        return {
          id:
            item.size.id,

          name:
            item.size.name.trim(),

          price,

          formattedPrice:
            this.currencyFormatter.format(
              price,
            ),
        };
      })
      .filter(item =>
        Number.isFinite(item.price),
      )
      .sort(
        (
          first,
          second,
        ) =>
          first.price -
          second.price,
      );
  }

  private resolveDescription(
    pizza: PizzaDto,
  ): string {
    const ingredients =
      pizza.ingredients
        ?.map(ingredient =>
          ingredient.name?.trim(),
        )
        .filter(
          (
            name,
          ): name is string =>
            Boolean(name),
        ) ??
      [];

    if (ingredients.length > 0) {
      return ingredients.join(', ');
    }

    const description =
      pizza.description?.trim();

    if (description) {
      return description;
    }

    return 'Preparada al momento con ingredientes frescos.';
  }
}
