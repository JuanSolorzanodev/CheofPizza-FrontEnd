import { DOCUMENT, isPlatformBrowser } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Router } from '@angular/router';

import { finalize } from 'rxjs';

import { SkeletonModule } from 'primeng/skeleton';

import { PromotionApiService } from '../../../core/api/promotions/promotion-api.service';

import { AppLoggerService } from '../../../core/logging/app-logger.service';

import { PromotionDto } from '../../../core/api/promotions/promotion.models';

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
  imports: [SkeletonModule],
  templateUrl: './carousel-component.html',
  styleUrl: './carousel-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarouselComponent {
  private readonly router = inject(Router);

  private readonly promotionApi = inject(PromotionApiService);

  private readonly logger = inject(AppLoggerService);

  private readonly destroyRef = inject(DestroyRef);

  private readonly platformId = inject(PLATFORM_ID);

  private readonly document = inject(DOCUMENT);

  private readonly autoplayDelayMs = 6000;

  private autoplayTimer: ReturnType<typeof setInterval> | null = null;

  private interactionPaused = false;

  private pointerStartX: number | null = null;

  private pointerStartY: number | null = null;

  readonly loading = signal(true);

  readonly error = signal<string | null>(null);

  readonly banners = signal<PromotionBanner[]>([]);

  readonly activeIndex = signal(0);

  readonly hasMultipleBanners = computed(() => this.banners().length > 1);

  readonly currentBanner = computed(() => this.banners()[this.activeIndex()] ?? null);

  constructor() {
    this.bindDocumentVisibility();
    this.loadPromotions();

    this.destroyRef.onDestroy(() => {
      this.stopAutoplay();
    });
  }

  previous(): void {
    const total = this.banners().length;

    if (total <= 1) {
      return;
    }

    this.selectSlide((this.activeIndex() - 1 + total) % total, true);
  }

  next(): void {
    const total = this.banners().length;

    if (total <= 1) {
      return;
    }

    this.selectSlide((this.activeIndex() + 1) % total, true);
  }

  goToSlide(index: number): void {
    this.selectSlide(index, true);
  }

  goToPromotion(slug: string): void {
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
      return;
    }

    void this.router.navigate(['/promociones', normalizedSlug]);
  }

  retry(): void {
    if (this.loading()) {
      return;
    }

    this.loadPromotions();
  }

  pauseAutoplay(): void {
    this.interactionPaused = true;

    this.stopAutoplay();
  }

  resumeAutoplay(): void {
    this.interactionPaused = false;

    this.startAutoplay();
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.hasMultipleBanners()) {
      return;
    }

    this.pointerStartX = event.clientX;

    this.pointerStartY = event.clientY;
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerStartX === null || this.pointerStartY === null) {
      return;
    }

    const horizontalDistance = event.clientX - this.pointerStartX;

    const verticalDistance = event.clientY - this.pointerStartY;

    this.resetPointer();

    const isHorizontalSwipe =
      Math.abs(horizontalDistance) >= 48 &&
      Math.abs(horizontalDistance) > Math.abs(verticalDistance);

    if (!isHorizontalSwipe) {
      return;
    }

    if (horizontalDistance < 0) {
      this.next();

      return;
    }

    this.previous();
  }

  onPointerCancel(): void {
    this.resetPointer();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.hasMultipleBanners()) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previous();
        break;

      case 'ArrowRight':
        event.preventDefault();
        this.next();
        break;

      case 'Home':
        event.preventDefault();
        this.selectSlide(0, true);
        break;

      case 'End':
        event.preventDefault();
        this.selectSlide(this.banners().length - 1, true);
        break;
    }
  }

  private loadPromotions(): void {
    this.stopAutoplay();

    this.loading.set(true);
    this.error.set(null);

    this.promotionApi
      .getPromotions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (promotions) => {
          const banners = (promotions ?? [])
            .filter(
              (promotion) => typeof promotion.slug === 'string' && promotion.slug.trim().length > 0,
            )
            .map((promotion) => this.mapPromotionToBanner(promotion));

          this.banners.set(banners);

          this.activeIndex.set(0);

          this.startAutoplay();
        },

        error: (error) => {
          const message =
            typeof error?.error?.message === 'string'
              ? error.error.message
              : typeof error?.message === 'string'
                ? error.message
                : 'No se pudieron cargar las promociones.';

          this.error.set(message);

          this.banners.set([]);
          this.activeIndex.set(0);

          this.logger.error('Error al cargar promociones:', error);
        },
      });
  }

  private selectSlide(index: number, restartAutoplay: boolean): void {
    const total = this.banners().length;

    if (total === 0 || index < 0 || index >= total || index === this.activeIndex()) {
      return;
    }

    this.activeIndex.set(index);

    if (restartAutoplay) {
      this.restartAutoplay();
    }
  }

  private startAutoplay(): void {
    if (
      !isPlatformBrowser(this.platformId) ||
      !this.hasMultipleBanners() ||
      this.document.hidden ||
      this.interactionPaused
    ) {
      return;
    }

    this.stopAutoplay();

    this.autoplayTimer = setInterval(() => {
      const total = this.banners().length;

      if (total <= 1) {
        return;
      }

      this.activeIndex.update((current) => (current + 1) % total);
    }, this.autoplayDelayMs);
  }

  private stopAutoplay(): void {
    if (this.autoplayTimer === null) {
      return;
    }

    clearInterval(this.autoplayTimer);

    this.autoplayTimer = null;
  }

  private restartAutoplay(): void {
    this.stopAutoplay();

    if (!this.interactionPaused) {
      this.startAutoplay();
    }
  }

  private bindDocumentVisibility(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const handleVisibilityChange = (): void => {
      if (this.document.hidden) {
        this.stopAutoplay();

        return;
      }

      this.startAutoplay();
    };

    this.document.addEventListener('visibilitychange', handleVisibilityChange);

    this.destroyRef.onDestroy(() => {
      this.document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  private resetPointer(): void {
    this.pointerStartX = null;

    this.pointerStartY = null;
  }

  private mapPromotionToBanner(promotion: PromotionDto): PromotionBanner {
    const name = promotion.name?.trim() || 'Promoción especial';

    return {
      id: promotion.id,

      imageUrl: promotion.banner_image_url?.trim() || null,

      alt: `Promoción ${name}`,

      promotionSlug: promotion.slug.trim(),

      title: name,

      subtitle: promotion.description?.trim() || this.buildSubtitle(promotion),

      priceLabel: this.buildPriceLabel(promotion),

      typeLabel: promotion.type === 'size_fixed_price' ? 'Precio especial' : 'Combo de la casa',
    };
  }

  private buildSubtitle(promotion: PromotionDto): string {
    if (promotion.type === 'size_fixed_price') {
      return (
        promotion.size_prices
          ?.map((item) => {
            const sizeName = item.size?.name ?? 'Tamaño';

            return `${sizeName} ` + this.formatMoney(item.price);
          })
          .join(' · ') || 'Elige tu tamaño favorito y disfruta el precio promocional.'
      );
    }

    return (
      promotion.details
        ?.map((detail) => {
          const quantity = Math.max(0, Number(detail.required_quantity ?? 0));

          const category = detail.category?.name ?? 'pizza';

          return `${quantity} ${category}`;
        })
        .join(' + ') || 'Una combinación especial preparada para compartir.'
    );
  }

  private buildPriceLabel(promotion: PromotionDto): string {
    if (promotion.type === 'size_fixed_price') {
      const prices = promotion.size_prices
        ?.map((item) => {
          const sizeName = item.size?.name ?? 'Tamaño';

          return `${sizeName} ` + this.formatMoney(item.price);
        })
        .join(' · ');

      return prices || 'Precio promocional';
    }

    return this.formatMoney(promotion.price);
  }

  private formatMoney(value: number | string | null | undefined): string {
    const numericValue = Number(value ?? 0);

    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(numericValue) ? numericValue : 0);
  }
}
