import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  effect,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { CheckboxModule } from 'primeng/checkbox';
import { SkeletonModule } from 'primeng/skeleton';
import { AccordionModule } from 'primeng/accordion';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MessageService } from 'primeng/api';

import { CatalogApiService } from '../../../core/api/catalog/catalog-api.service';
import { IngredientDto, PizzaDto, SizeDto } from '../../../core/api/catalog/catalog.models';

import { BuilderApiService } from '../../../core/api/builder/builder-api.service';
import {
  AppliesTo,
  BuilderQuoteRequestDto,
  BuilderQuoteResponseDto,
} from '../../../core/api/builder/builder.models';
import { CartStore } from '../../../core/api/cart/cart.store';

type UiSizeKey = 'peq' | 'med' | 'fam' | 'gig';

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

    ButtonModule,
    InputNumberModule,
    DividerModule,
    ChipModule,
    CheckboxModule,
    SkeletonModule,
    AccordionModule,

    SelectModule,
    SelectButtonModule,
  ],
  templateUrl: './pizza-builder.html',
  styleUrl: './pizza-builder.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PizzaBuilder {
  private readonly api = inject(CatalogApiService);
  private readonly builderApi = inject(BuilderApiService);

  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);

  // =========================
  // Config
  // =========================
  readonly maxExtras = 4;
  readonly minQty = 1;
  readonly maxQty = 10;

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
    { label: 'Toda la pizza', value: 'ALL' },
    { label: 'Mitad A', value: 'A' },
    { label: 'Mitad B', value: 'B' },
  ];

  // =========================
  // State
  // =========================
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly pizzaA = signal<PizzaDto | null>(null);

  readonly isHalfAndHalf = signal(false);
  readonly allPizzas = signal<PizzaDto[]>([]);
  readonly secondPizzaId = signal<number | null>(null);

  readonly sizeKey = signal<UiSizeKey | null>(null);
  readonly quantity = signal<number>(1);

  readonly baseIngredientsA = signal<string[]>([]);
  readonly baseIngredientsB = signal<string[]>([]);

  readonly originalIngredientsA = signal<string[]>([]);
  readonly originalIngredientsB = signal<string[]>([]);

  readonly extrasCatalog = signal<IngredientDto[]>([]);
  readonly selectedExtras = signal<Map<number, SelectedExtra>>(new Map());
  readonly extrasAccordionOpen = signal<boolean>(false);

  // =========================
  // Quote (Backend)
  // =========================
  readonly quoteLoading = signal(false);
  readonly quoteError = signal<string | null>(null);
  readonly quote = signal<BuilderQuoteResponseDto | null>(null);

  private quoteTimer: any = null;
  private quoteSub?: Subscription;

  // =========================
  // Computed
  // =========================
  readonly pizzaB = computed<PizzaDto | null>(() => {
    const id = this.secondPizzaId();
    if (!id) return null;
    return this.allPizzas().find(p => p.id === id) ?? null;
  });

  readonly pizzaOptions = computed<Option<number>[]>(() => {
    const a = this.pizzaA();
    const list = this.allPizzas();
    if (!a || list.length === 0) return [];

    return list
      .filter(p => p.id !== a.id)
      .map(p => ({ label: p.name, value: p.id }));
  });

  readonly selectedSize = computed<SizeDto | null>(() => {
    const p = this.pizzaA();
    const key = this.sizeKey();
    if (!p || !key) return null;

    const wanted = this.sizeNameByKey(key);
    const all = p.category.size_prices?.map(sp => sp.size) ?? [];
    return all.find(s => s.name === wanted) ?? null;
  });

  readonly heroImage = computed(() => this.pizzaA()?.image_url || this.fallbackImage);

  // ✅ El builder ahora toma precios del BACKEND si existe quote
  readonly basePrice = computed(() => this.quote()?.base_price ?? 0);
  readonly extrasPrice = computed(() => this.quote()?.extras_total ?? 0);
  readonly unitPrice = computed(() => this.quote()?.unit_price ?? 0);
  readonly total = computed(() => this.quote()?.total ?? 0);
  private readonly cart = inject(CartStore);

  readonly extrasCount = computed(() => this.selectedExtras().size);

  readonly extrasAccordionValue = computed(() => (this.extrasAccordionOpen() ? 'extras' : null));
  onExtrasAccordionChange(v: any): void {
    this.extrasAccordionOpen.set(v === 'extras');
  }

  readonly canCheckout = computed(() => {
    const a = this.pizzaA();
    const s = this.selectedSize();
    const q = this.quantity();

    if (!a || !s) return false;
    if (q < this.minQty || q > this.maxQty) return false;
    if (this.isHalfAndHalf() && !this.pizzaB()) return false;

    // además, idealmente: que haya cotización válida
    return !!this.quote() && !this.quoteLoading() && !this.quoteError();
  });

  readonly baseLocksHint = computed(() => 'Pasta/salsa de tomate y queso no se pueden quitar.');

  readonly hasIngredientChangesA = computed(() => !this.arraysEqual(this.baseIngredientsA(), this.originalIngredientsA()));
  readonly hasIngredientChangesB = computed(() => !this.arraysEqual(this.baseIngredientsB(), this.originalIngredientsB()));

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
    this.setupQuoteAutoRecalc();
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

    this.api.getAllPizzas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => this.allPizzas.set(list ?? []),
        error: () => this.allPizzas.set([]),
      });

    this.api
      .getPizzaByName(name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (p) => {
          this.pizzaA.set(p);

          const baseA = this.getBaseIngredientsFromPizza(p);
          this.baseIngredientsA.set(baseA);
          this.originalIngredientsA.set([...baseA]);

          this.baseIngredientsB.set([]);
          this.originalIngredientsB.set([]);

          this.isHalfAndHalf.set(false);
          this.secondPizzaId.set(null);

          this.sizeKey.set(null);
          this.quantity.set(1);

          this.selectedExtras.set(new Map());
          this.extrasAccordionOpen.set(false);

          this.quote.set(null);
          this.quoteError.set(null);

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

  // =========================
  // Quote Integration
  // =========================
private buildQuotePayload(): BuilderQuoteRequestDto | null {
  const a = this.pizzaA();
  const b = this.pizzaB();
  const s = this.selectedSize();
  const q = this.quantity();

  if (!a || !s) return null;
  if (q < this.minQty || q > this.maxQty) return null;
  if (this.isHalfAndHalf() && !b) return null;

  const extras = Array.from(this.selectedExtras().entries()).map(([ingredientId, sel]) => ({
    ingredient_id: ingredientId,
    applies_to: sel.appliesTo,
  }));

  return {
    pizza_id: a.id,
    is_half_and_half: this.isHalfAndHalf(),
    second_pizza_id: this.isHalfAndHalf() ? (b?.id ?? null) : null,
    size_id: s.id,
    quantity: q,
    customizations: extras.map(extra => ({
      action: 'extra' as const,
      ingredient_id: extra.ingredient_id,
      applies_to: extra.applies_to,
    })),
    extras,
  };
}

  private setupQuoteAutoRecalc(): void {
    effect(() => {
      // dependencias reactivas
      this.pizzaA();
      this.pizzaB();
      this.isHalfAndHalf();
      this.selectedSize();
      this.quantity();
      this.selectedExtras();

      const payload = this.buildQuotePayload();

      // si no se puede cotizar aún, limpiamos quote
      if (!payload) {
        this.cancelQuoteInFlight();
        this.quote.set(null);
        this.quoteError.set(null);
        this.quoteLoading.set(false);
        return;
      }

      // debounce + cancelación
      this.cancelQuoteTimer();
      this.quoteTimer = setTimeout(() => {
        this.cancelQuoteInFlight();

        this.quoteLoading.set(true);
        this.quoteError.set(null);

        this.quoteSub = this.builderApi
          .quote(payload)
          .pipe(finalize(() => this.quoteLoading.set(false)))
          .subscribe({
            next: (res) => this.quote.set(res),
            error: (e: Error) => {
              this.quote.set(null);
              this.quoteError.set(e.message);
            },
          });
      }, 250);
    }, { allowSignalWrites: true });
  }

  private cancelQuoteTimer(): void {
    if (this.quoteTimer) {
      clearTimeout(this.quoteTimer);
      this.quoteTimer = null;
    }
  }

  private cancelQuoteInFlight(): void {
    if (this.quoteSub) {
      this.quoteSub.unsubscribe();
      this.quoteSub = undefined;
    }
  }

  // =========================
  // Half & half
  // =========================
  setHalfAndHalf(checked: boolean): void {
    this.isHalfAndHalf.set(checked);

    if (!checked) {
      this.secondPizzaId.set(null);
      this.baseIngredientsB.set([]);
      this.originalIngredientsB.set([]);

      const current = new Map(this.selectedExtras());
      for (const [id, sel] of current.entries()) {
        current.set(id, { ...sel, appliesTo: 'ALL' });
      }
      this.selectedExtras.set(current);
    }
  }

  setSecondPizzaId(id: number | null): void {
    this.secondPizzaId.set(id);

    const b = this.pizzaB();
    const baseB = b ? this.getBaseIngredientsFromPizza(b) : [];
    this.baseIngredientsB.set(baseB);
    this.originalIngredientsB.set([...baseB]);
  }

  // =========================
  // Helpers
  // =========================
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

  private getBaseIngredientsFromPizza(p: PizzaDto | null): string[] {
    if (!p) return [];

    const fromRelation =
      (p.ingredients ?? [])
        .map(i => i?.name)
        .filter((x): x is string => !!x)
        .map(x => x.trim())
        .filter(Boolean);

    const fallbackFromDesc = (p.description ?? '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const base = fromRelation.length ? fromRelation : fallbackFromDesc;
    return this.ensureMandatoryBase(base);
  }

  private ensureMandatoryBase(list: string[]): string[] {
    const norm = list.map(x => this.normalizeText(x));

    const hasSauce =
      norm.some(n =>
        this.lockTokens.tomato.some(t => n.includes(t)) &&
        this.lockTokens.sauceWords.some(w => n.includes(w))
      ) || norm.includes(this.normalizeText(this.mandatoryBase.sauceLabel));

    const hasCheese =
      norm.some(n => this.lockTokens.cheese.some(t => n.includes(t))) ||
      norm.includes(this.normalizeText(this.mandatoryBase.cheeseLabel));

    const next = [...list];

    if (!hasSauce) next.unshift(this.mandatoryBase.sauceLabel);
    if (!hasCheese) next.unshift(this.mandatoryBase.cheeseLabel);

    const seen = new Set<string>();
    return next.filter(x => {
      const k = this.normalizeText(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  // =========================
  // Base ingredients (LOCK) + Restablecer
  // =========================
  isBaseIngredientLocked(name: string): boolean {
    const n = this.normalizeText(name);

    const isCheese = this.lockTokens.cheese.some(t => n.includes(t));

    const hasTomato = this.lockTokens.tomato.some(t => n.includes(t));
    const hasSauceWord = this.lockTokens.sauceWords.some(w => n.includes(w));
    const isSauce = hasTomato && hasSauceWord;

    const isForcedSauce = n === this.normalizeText(this.mandatoryBase.sauceLabel);
    const isForcedCheese = n === this.normalizeText(this.mandatoryBase.cheeseLabel);

    return isCheese || isSauce || isForcedSauce || isForcedCheese;
  }

  removeBaseIngredientA(name: string): void {
    if (this.isBaseIngredientLocked(name)) return;
    this.baseIngredientsA.set(this.baseIngredientsA().filter(i => i !== name));
  }

  removeBaseIngredientB(name: string): void {
    if (this.isBaseIngredientLocked(name)) return;
    this.baseIngredientsB.set(this.baseIngredientsB().filter(i => i !== name));
  }

  resetBaseIngredientsA(): void {
    this.baseIngredientsA.set([...this.originalIngredientsA()]);
  }

  resetBaseIngredientsB(): void {
    this.baseIngredientsB.set([...this.originalIngredientsB()]);
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
      current.set(extra.id, { ingredient: extra, appliesTo: 'ALL' });
    } else {
      current.delete(extra.id);
    }

    this.selectedExtras.set(current);
  }

  setExtraAppliesTo(extraId: number, appliesTo: AppliesTo): void {
    const current = new Map(this.selectedExtras());
    const sel = current.get(extraId);
    if (!sel) return;

    current.set(extraId, {
      ...sel,
      appliesTo: this.isHalfAndHalf() ? appliesTo : 'ALL',
    });

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
/*     if (!this.canCheckout()) return;
    console.log('ADD TO CART', this.buildPayload()); */
 if (!this.canCheckout()) return;

  const payload = this.buildQuotePayload(); // o el método equivalente tuyo
  if (!payload) return;

  this.cart.addPizza(payload);

  this.messages.add({
    severity: 'success',
    summary: 'Agregado',
    detail: 'La pizza se agregó correctamente al carrito.',
    life: 2000,
  });
  }

  buyNow(): void {
    if (!this.canCheckout()) return;
    console.log('BUY NOW', this.buildPayload());
  }

  private buildPayload() {
    const a = this.pizzaA();
    const b = this.pizzaB();
    const s = this.selectedSize();
    const q = this.quote();

    return {
      sizeId: s?.id ?? null,
      sizeName: s?.name ?? null,
      quantity: this.quantity(),

      isHalfAndHalf: this.isHalfAndHalf(),
      pizzaA: a ? { id: a.id, name: a.name } : null,
      pizzaB: this.isHalfAndHalf() && b ? { id: b.id, name: b.name } : null,

      ingredientsA: this.baseIngredientsA(),
      ingredientsB: this.isHalfAndHalf() ? this.baseIngredientsB() : [],

      extras: Array.from(this.selectedExtras().values()).map(sel => ({
        id: sel.ingredient.id,
        name: sel.ingredient.name,
        appliesTo: sel.appliesTo,
      })),

      // ✅ Precios ya validados por backend
      basePrice: q?.base_price ?? 0,
      extrasTotal: q?.extras_total ?? 0,
      unitPrice: q?.unit_price ?? 0,
      total: q?.total ?? 0,

      image_url: a?.image_url ?? null,
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
