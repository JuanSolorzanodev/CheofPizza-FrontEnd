import {
  isPlatformBrowser,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  isDevMode,
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
  PromotionApiService,
} from '../../../core/api/promotions/promotion-api.service';

import {
  PromotionDto,
} from '../../../core/api/promotions/promotion.models';

interface PromotionBanner {
  id: number;
  imageUrl: string | null;
  alt: string;
  promotionSlug: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  typeLabel: string;
}

@Component({
  selector: 'app-carousel-component',
  standalone: true,
  imports: [
    SkeletonModule,
  ],
  templateUrl:
    './carousel-component.html',
  styleUrl:
    './carousel-component.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  private readonly router =
    inject(Router);

  private readonly promotionApi =
    inject(PromotionApiService);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly platformId =
    inject(PLATFORM_ID);

  /**
   * Tiempo durante el cual se muestra cada promoción.
   */
  private readonly autoplayDelayMs =
    6000;

  private autoplayTimer:
    ReturnType<typeof window.setInterval> |
    null = null;

  private pointerStartX:
    number |
    null = null;

  private pointerStartY:
    number |
    null = null;

  readonly loading =
    signal(true);

  readonly error =
    signal<string | null>(
      null,
    );

  readonly banners =
    signal<PromotionBanner[]>(
      [],
    );

  readonly activeIndex =
    signal(0);

  readonly hasMultipleBanners =
    computed(
      () =>
        this.banners().length > 1,
    );

  readonly currentBanner =
    computed(
      () =>
        this.banners()[
          this.activeIndex()
        ] ??
        null,
    );

  constructor() {
    this.bindDocumentVisibility();
    this.loadPromotions();

    this.destroyRef.onDestroy(
      () => {
        this.stopAutoplay();
      },
    );
  }

  previous(): void {
    const total =
      this.banners().length;

    if (total <= 1) {
      return;
    }

    const nextIndex =
      (
        this.activeIndex() -
        1 +
        total
      ) % total;

    this.selectSlide(
      nextIndex,
      true,
    );
  }

  next(): void {
    const total =
      this.banners().length;

    if (total <= 1) {
      return;
    }

    const nextIndex =
      (
        this.activeIndex() +
        1
      ) % total;

    this.selectSlide(
      nextIndex,
      true,
    );
  }

  goToSlide(
    index: number,
  ): void {
    this.selectSlide(
      index,
      true,
    );
  }

  goToPromotion(
    slug: string,
  ): void {
    const normalizedSlug =
      slug.trim();

    if (
      normalizedSlug === ''
    ) {
      return;
    }

    void this.router.navigate([
      '/promociones',
      normalizedSlug,
    ]);
  }

  retry(): void {
    if (this.loading()) {
      return;
    }

    this.loadPromotions();
  }

  onPointerDown(
    event: PointerEvent,
  ): void {
    if (
      !this.hasMultipleBanners()
    ) {
      return;
    }

    this.pointerStartX =
      event.clientX;

    this.pointerStartY =
      event.clientY;
  }

  onPointerUp(
    event: PointerEvent,
  ): void {
    if (
      this.pointerStartX === null ||
      this.pointerStartY === null
    ) {
      return;
    }

    const horizontalDistance =
      event.clientX -
      this.pointerStartX;

    const verticalDistance =
      event.clientY -
      this.pointerStartY;

    this.pointerStartX =
      null;

    this.pointerStartY =
      null;

    /*
     * El gesto solo se considera navegación cuando:
     * - supera 48 píxeles;
     * - el movimiento horizontal domina sobre el vertical.
     */
    if (
      Math.abs(
        horizontalDistance,
      ) < 48 ||
      Math.abs(
        horizontalDistance,
      ) <=
        Math.abs(
          verticalDistance,
        )
    ) {
      return;
    }

    if (
      horizontalDistance < 0
    ) {
      this.next();

      return;
    }

    this.previous();
  }

  onPointerCancel(): void {
    this.pointerStartX =
      null;

    this.pointerStartY =
      null;
  }

  @HostListener(
    'keydown',
    ['$event'],
  )
  onKeydown(
    event: KeyboardEvent,
  ): void {
    if (
      !this.hasMultipleBanners()
    ) {
      return;
    }

    if (
      event.key ===
      'ArrowLeft'
    ) {
      event.preventDefault();
      this.previous();

      return;
    }

    if (
      event.key ===
      'ArrowRight'
    ) {
      event.preventDefault();
      this.next();
    }
  }

  private selectSlide(
    index: number,
    restartAutoplay: boolean,
  ): void {
    const total =
      this.banners().length;

    if (
      total === 0 ||
      index < 0 ||
      index >= total ||
      index ===
        this.activeIndex()
    ) {
      return;
    }

    this.activeIndex.set(
      index,
    );

    if (restartAutoplay) {
      this.restartAutoplay();
    }
  }

  private loadPromotions(): void {
    this.stopAutoplay();

    this.loading.set(true);
    this.error.set(null);

    this.promotionApi
      .getPromotions()
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),

        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: promotions => {
          const banners =
            (promotions ?? [])
              .filter(
                promotion =>
                  typeof promotion.slug ===
                    'string' &&
                  promotion.slug
                    .trim() !== '',
              )
              .map(
                promotion =>
                  this.mapPromotionToBanner(
                    promotion,
                  ),
              );

          this.banners.set(
            banners,
          );

          this.activeIndex.set(
            0,
          );

          this.startAutoplay();
        },

        error: error => {
          const message =
            typeof error?.error
              ?.message ===
              'string'
              ? error.error.message
              : typeof error
                    ?.message ===
                  'string'
                ? error.message
                : (
                    'No se pudieron cargar '
                    + 'las promociones.'
                  );

          this.error.set(
            message,
          );

          this.banners.set([]);
          this.activeIndex.set(0);

          if (isDevMode()) {
            console.error(
              'Error al cargar promociones:',
              error,
            );
          }
        },
      });
  }

  private startAutoplay(): void {
    if (
      !isPlatformBrowser(
        this.platformId,
      ) ||
      !this.hasMultipleBanners() ||
      document.hidden
    ) {
      return;
    }

    this.stopAutoplay();

    this.autoplayTimer =
      window.setInterval(
        () => {
          const total =
            this.banners().length;

          if (total <= 1) {
            return;
          }

          this.activeIndex.update(
            current =>
              (
                current +
                1
              ) % total,
          );
        },
        this.autoplayDelayMs,
      );
  }

  private stopAutoplay(): void {
    if (
      this.autoplayTimer ===
      null
    ) {
      return;
    }

    window.clearInterval(
      this.autoplayTimer,
    );

    this.autoplayTimer =
      null;
  }

  private restartAutoplay(): void {
    this.stopAutoplay();
    this.startAutoplay();
  }

  private bindDocumentVisibility(): void {
    if (
      !isPlatformBrowser(
        this.platformId,
      )
    ) {
      return;
    }

    const handleVisibilityChange =
      (): void => {
        if (document.hidden) {
          this.stopAutoplay();

          return;
        }

        this.startAutoplay();
      };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    );

    this.destroyRef.onDestroy(
      () => {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange,
        );
      },
    );
  }

  private mapPromotionToBanner(
    promotion: PromotionDto,
  ): PromotionBanner {
    const name =
      promotion.name?.trim() ||
      'Promoción especial';

    return {
      id:
        promotion.id,

      imageUrl:
        promotion
          .banner_image_url
          ?.trim() ||
        null,

      alt:
        `Promoción ${name}`,

      promotionSlug:
        promotion.slug.trim(),

      title:
        name,

      subtitle:
        promotion.description
          ?.trim() ||
        this.buildSubtitle(
          promotion,
        ),

      priceLabel:
        this.buildPriceLabel(
          promotion,
        ),

      typeLabel:
        promotion.type ===
        'size_fixed_price'
          ? 'Precio especial por tamaño'
          : 'Combo de la casa',
    };
  }

  private buildSubtitle(
    promotion: PromotionDto,
  ): string {
    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      return (
        promotion.size_prices
          ?.map(item => {
            const sizeName =
              item.size?.name ??
              'Tamaño';

            return (
              `${sizeName} ` +
              this.formatMoney(
                item.price,
              )
            );
          })
          .join(' · ') ||
        (
          'Elige tu tamaño favorito '
          + 'y disfruta el precio '
          + 'promocional.'
        )
      );
    }

    return (
      promotion.details
        ?.map(detail => {
          const quantity =
            Math.max(
              0,
              Number(
                detail
                  .required_quantity ??
                0,
              ),
            );

          const category =
            detail.category?.name ??
            'pizza';

          return (
            `${quantity} ${category}`
          );
        })
        .join(' + ') ||
      (
        'Una combinación especial '
        + 'preparada para compartir.'
      )
    );
  }

  private buildPriceLabel(
    promotion: PromotionDto,
  ): string {
    if (
      promotion.type ===
      'size_fixed_price'
    ) {
      const prices =
        promotion.size_prices
          ?.map(item => {
            const sizeName =
              item.size?.name ??
              'Tamaño';

            return (
              `${sizeName} ` +
              this.formatMoney(
                item.price,
              )
            );
          })
          .join(' · ');

      return (
        prices ||
        'Precio promocional'
      );
    }

    return this.formatMoney(
      promotion.price,
    );
  }

  private formatMoney(
    value:
      | number
      | string
      | null
      | undefined,
  ): string {
    const numericValue =
      Number(value ?? 0);

    return new Intl.NumberFormat(
      'es-EC',
      {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
