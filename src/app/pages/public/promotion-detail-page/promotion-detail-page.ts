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
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';

import { PromotionApiService } from '../../../core/api/promotions/promotion-api.service';
import { PromotionDto } from '../../../core/api/promotions/promotion.models';
import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import { PizzaDto } from '../../../core/api/catalog/catalog.models';
import { CartStore } from '../../../core/api/cart/cart.store';

interface SelectOption<T> {
  label: string;
  value: T;
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
    DividerModule,
    TagModule,
    SkeletonModule,
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

  readonly selectedSencillaId = signal<number | null>(null);
  readonly selectedEspecialId = signal<number | null>(null);
  readonly quantity = signal<number>(1);

  readonly promotionSizeName = computed(() =>
    this.promotion()?.details?.[0]?.size?.name ?? '—'
  );

  readonly selectedSencilla = computed(() =>
    this.sencillas().find(p => p.id === this.selectedSencillaId()) ?? null
  );

  readonly selectedEspecial = computed(() =>
    this.especiales().find(p => p.id === this.selectedEspecialId()) ?? null
  );

  readonly selectedPizzaIds = computed<number[]>(() => {
    const ids = [this.selectedEspecialId(), this.selectedSencillaId()]
      .filter((v): v is number => typeof v === 'number' && v > 0);
    return ids;
  });

  readonly canSubmit = computed(() => {
    return !!this.promotion()
      && this.selectedPizzaIds().length === 2
      && this.quantity() >= 1
      && this.quantity() <= 10
      && !this.submitting();
  });

  readonly sencillaOptions = computed<SelectOption<number>[]>(() =>
    this.sencillas().map(p => ({ label: p.name, value: p.id }))
  );

  readonly especialOptions = computed<SelectOption<number>[]>(() =>
    this.especiales().map(p => ({ label: p.name, value: p.id }))
  );

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
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: ({ promotion, sencillas, especiales }) => {
          this.promotion.set(promotion);
          this.sencillas.set(sencillas ?? []);
          this.especiales.set(especiales ?? []);
          this.quantity.set(1);
          this.selectedSencillaId.set(null);
          this.selectedEspecialId.set(null);
        },
        error: (e: Error) => {
          this.error.set(e.message);
        },
      });
  }

  setQuantity(value: number | null | undefined): void {
    const n = Number(value ?? 1);
    const safe = Math.max(1, Math.min(10, Math.trunc(n || 1)));
    this.quantity.set(safe);
  }

  addPromotionToCart(): void {
    const promotion = this.promotion();
    if (!promotion) return;

    if (!this.canSubmit()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección incompleta',
        detail: 'Debes elegir una pizza especial y una sencilla.',
      });
      return;
    }

    this.submitting.set(true);

    this.cart.addPromotion({
      promotion_id: promotion.id,
      quantity: this.quantity(),
      selected_pizza_ids: this.selectedPizzaIds(),
    });

    setTimeout(() => {
      this.submitting.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Promoción agregada',
        detail: 'La promoción se agregó correctamente al carrito.',
      });
    }, 350);
  }

  goCheckout(): void {
    this.router.navigate(['/checkout']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
