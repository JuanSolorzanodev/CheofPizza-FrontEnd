import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { AccordionModule } from 'primeng/accordion';

import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import { IngredientDto, PizzaDto, SizeDto } from '../../../core/api/catalog/catalog.models';

type UiSizeKey = 'peq' | 'med' | 'fam' | 'gig';

@Component({
  selector: 'app-pizza-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputNumberModule,
    DividerModule,
    ChipModule,
    CheckboxModule,
    SkeletonModule,
    AccordionModule,
  ],
  templateUrl: './pizza-builder.html',
  styleUrl: './pizza-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PizzaBuilder {
  private readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  // =========================
  // Config
  // =========================
  readonly maxExtras = 4;
  readonly minQty = 1;
  readonly maxQty = 10;

  /**
   * Reglas "lock":
   * - NO se puede quitar pasta/salsa de tomate
   * - NO se puede quitar queso (cualquier variante)
   *
   * Nota: Se detecta por tokens para tolerar variaciones en el description.
   */
  private readonly lockTokens = {
    sauce: ['pasta', 'salsa', 'tomate'],
    cheese: ['queso', 'mozzarella', 'mosarela'],
  };

  // =========================
  // State
  // =========================
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly pizza = signal<PizzaDto | null>(null);

  /** SIN preselección */
  readonly sizeKey = signal<UiSizeKey | null>(null);

  /** Cantidad */
  readonly quantity = signal<number>(1);

  /** Ingredientes base desde description */
  readonly baseIngredients = signal<string[]>([]);

  /** Extras */
  readonly extrasCatalog = signal<IngredientDto[]>([]);
  readonly selectedExtras = signal<Map<number, IngredientDto>>(new Map());

  /** ✅ Accordion cerrado por defecto */
  readonly extrasAccordionOpen = signal<boolean>(false);

  // =========================
  // Computed
  // =========================
  readonly sizes = computed<SizeDto[]>(() => {
    const p = this.pizza();
    if (!p) return [];
    return (p.category.size_prices ?? []).map(sp => sp.size);
  });

  readonly selectedSize = computed<SizeDto | null>(() => {
    const p = this.pizza();
    const key = this.sizeKey();
    if (!p || !key) return null;

    const wanted = this.sizeNameByKey(key);
    const all = p.category.size_prices?.map(sp => sp.size) ?? [];
    return all.find(s => s.name === wanted) ?? null;
  });

  readonly heroImage = computed(() => this.pizza()?.image_url || this.fallbackImage);

  readonly basePrice = computed(() => {
    const p = this.pizza();
    const s = this.selectedSize();
    if (!p || !s) return 0;

    const found = p.category.size_prices?.find(sp => sp.size.id === s.id);
    return Number(found?.price ?? 0);
  });

  readonly extrasPrice = computed(() => {
    const s = this.selectedSize();
    if (!s) return 0;

    let sum = 0;
    for (const ex of this.selectedExtras().values()) {
      const extra = ex.extra_prices?.find(ep => ep.size.id === s.id);
      sum += Number(extra?.extra_price ?? 0);
    }
    return sum;
  });

  readonly unitPrice = computed(() => {
    if (!this.selectedSize()) return 0;
    return this.basePrice() + this.extrasPrice();
  });

  readonly total = computed(() => this.unitPrice() * this.quantity());

  readonly extrasCount = computed(() => this.selectedExtras().size);

  /** PrimeNG nuevo: accordion usa value */
  readonly extrasAccordionValue = computed(() => (this.extrasAccordionOpen() ? 'extras' : null));

  onExtrasAccordionChange(v: any): void {
    this.extrasAccordionOpen.set(v === 'extras');
  }

  /** Checkout habilitado solo con size válido */
  readonly canCheckout = computed(() => {
    const p = this.pizza();
    const s = this.selectedSize();
    const q = this.quantity();
    return !!p && !!s && q >= this.minQty && q <= this.maxQty;
  });

  /** Mensaje UX en ingredientes */
  readonly baseLocksHint = computed(() => {
    // Siempre mostramos esta regla (tu requerimiento)
    return 'Pasta/salsa de tomate y queso no se pueden quitar.';
  });

  readonly fallbackImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
        <rect width="800" height="500" fill="#f2f2f2"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="#666" font-family="Arial" font-size="28">
          Sin imagen
        </text>
      </svg>`
    );

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);

    const raw = this.route.snapshot.paramMap.get('name') ?? '';
    const name = decodeURIComponent(raw).trim();

    if (!name) {
      this.error.set('Nombre de pizza inválido.');
      this.loading.set(false);
      return;
    }

    this.api
      .getPizzaByName(name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (p) => {
          this.pizza.set(p);

          this.baseIngredients.set(this.parseIngredientsFromDescription(p.description));

          // SIN tamaño preseleccionado
          this.sizeKey.set(null);

          // reset extras
          this.selectedExtras.set(new Map());

          // accordion cerrado por defecto
          this.extrasAccordionOpen.set(false);

          this.loadExtras();
        },
        error: (e: Error) => this.error.set(e.message),
      });
  }

  private loadExtras(): void {
    this.api
      .getIngredients()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.extrasCatalog.set(list ?? []),
        error: () => this.extrasCatalog.set([]),
      });
  }

  private parseIngredientsFromDescription(desc: string | null): string[] {
    if (!desc) return [];
    return desc
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  private sizeNameByKey(k: UiSizeKey): string {
    switch (k) {
      case 'peq': return 'Pequeña';
      case 'med': return 'Mediana';
      case 'fam': return 'Familiar';
      case 'gig': return 'Gigante';
    }
  }

  setSize(k: UiSizeKey): void {
    this.sizeKey.set(k);
  }

  setQty(v: number): void {
    const n = Number(v || 1);
    const clamped = Math.min(this.maxQty, Math.max(this.minQty, n));
    this.quantity.set(clamped);
  }

  // =========================
  // Base ingredients (LOCK real)
  // =========================
  isBaseIngredientLocked(name: string): boolean {
    const n = this.normalizeText(name);

    // lock queso: si contiene "queso" o "mozzarella/mosarela"
    const isCheese = this.lockTokens.cheese.some(t => n.includes(t));

    // lock pasta/salsa tomate: si contiene tomate y (pasta|salsa)
    const hasTomato = n.includes('tomate');
    const hasSauceWord = this.lockTokens.sauce.some(t => n.includes(t));
    const isSauce = hasTomato && hasSauceWord;

    return isCheese || isSauce;
  }

  removeBaseIngredient(name: string): void {
    // ✅ bloqueo real
    if (this.isBaseIngredientLocked(name)) return;

    this.baseIngredients.set(this.baseIngredients().filter(i => i !== name));
  }

  // =========================
  // Extras
  // =========================
  isExtraDisabled(extra: IngredientDto): boolean {
    const selected = this.selectedExtras().has(extra.id);
    if (selected) return false;
    return this.extrasCount() >= this.maxExtras;
  }

  toggleExtra(extra: IngredientDto, checked: boolean): void {
    const current = new Map(this.selectedExtras());

    if (checked) {
      if (current.size >= this.maxExtras && !current.has(extra.id)) return;
      current.set(extra.id, extra);
    } else {
      current.delete(extra.id);
    }

    this.selectedExtras.set(current);
  }

  extraPriceFor(extra: IngredientDto): number {
    const s = this.selectedSize();
    if (!s) return 0;
    const found = extra.extra_prices?.find(ep => ep.size.id === s.id);
    return Number(found?.extra_price ?? 0);
  }

  // =========================
  // Actions
  // =========================
  addToCart(): void {
    if (!this.canCheckout()) return;
    console.log('ADD TO CART', this.buildPayload());
  }

  buyNow(): void {
    if (!this.canCheckout()) return;
    console.log('BUY NOW', this.buildPayload());
  }

  private buildPayload() {
    const p = this.pizza();
    const s = this.selectedSize();

    return {
      pizzaId: p?.id,
      name: p?.name,
      sizeId: s?.id,
      sizeName: s?.name,
      quantity: this.quantity(),
      baseIngredients: this.baseIngredients(),
      extras: Array.from(this.selectedExtras().values()).map(e => ({
        id: e.id,
        name: e.name,
        extra_price: this.extraPriceFor(e),
      })),
      unitPrice: this.unitPrice(),
      total: this.total(),
      image_url: p?.image_url ?? null,
    };
  }

  private normalizeText(v: string): string {
    return (v ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}
