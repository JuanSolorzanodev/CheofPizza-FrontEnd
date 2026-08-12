import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';

import { AdminCatalogApiService } from '../../../core/api/admin/catalog/admin-catalog-api.service';
import {
  AdminCategory,
  AdminSize,
} from '../../../core/api/admin/catalog/admin-catalog.models';
import { AdminPromotionsApiService } from '../../../core/api/admin/promotions/admin-promotions-api.service';
import {
  AdminPromotion,
  AdminPromotionStatus,
  AdminPromotionType,
  AdminPromotionValidationErrorResponse,
} from '../../../core/api/admin/promotions/admin-promotions.models';
import { AdminPromotionCardComponent } from '../../../shared/components/admin-promotion-card/admin-promotion-card';
import { AdminPromotionFormDialogComponent } from '../../../shared/components/admin-promotion-form-dialog/admin-promotion-form-dialog';

interface SelectOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-promotions',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    SelectModule,
    SkeletonModule,
    AdminPromotionCardComponent,
    AdminPromotionFormDialogComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './admin-promotions.html',
  styleUrl: './admin-promotions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromotions {
  private readonly promotionsApi = inject(AdminPromotionsApiService);
  private readonly catalogApi = inject(AdminCatalogApiService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly dialogSaving = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly changingVisibilityId = signal<number | null>(null);
  readonly dialogVisible = signal(false);

  readonly promotions = signal<AdminPromotion[]>([]);
  readonly categories = signal<AdminCategory[]>([]);
  readonly sizes = signal<AdminSize[]>([]);
  readonly editingPromotion = signal<AdminPromotion | null>(null);

  readonly search = signal('');
  readonly selectedStatus = signal<AdminPromotionStatus | 'all'>('all');
  readonly selectedType = signal<AdminPromotionType | 'all'>('all');

  readonly statusFilterOptions: SelectOption<
    AdminPromotionStatus | 'all'
  >[] = [
    { label: 'Todos los estados', value: 'all' },
    { label: 'Activas', value: 'active' },
    { label: 'Programadas', value: 'scheduled' },
    { label: 'Finalizadas', value: 'finished' },
    { label: 'Inactivas', value: 'inactive' },
  ];

  readonly typeFilterOptions: SelectOption<
    AdminPromotionType | 'all'
  >[] = [
    { label: 'Todos los tipos', value: 'all' },
    { label: 'Combos fijos', value: 'fixed_combo' },
    { label: 'Precio por tamaño', value: 'size_fixed_price' },
  ];

  readonly totalPromotions = computed(() => this.promotions().length);

  readonly activePromotions = computed(
    () =>
      this.promotions().filter(promotion => promotion.status === 'active')
        .length,
  );

  readonly scheduledPromotions = computed(
    () =>
      this.promotions().filter(promotion => promotion.status === 'scheduled')
        .length,
  );

  readonly protectedPromotions = computed(
    () =>
      this.promotions().filter(promotion => !promotion.can_delete).length,
  );

  readonly filteredPromotions = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('es');
    const status = this.selectedStatus();
    const type = this.selectedType();

    return this.promotions().filter(promotion => {
      const searchableText = [
        promotion.name,
        promotion.slug,
        promotion.description ?? '',
        this.typeLabel(promotion),
        ...promotion.details.map(detail =>
          [detail.category?.name ?? '', detail.size?.name ?? ''].join(' '),
        ),
        ...promotion.size_prices.map(price => price.size?.name ?? ''),
      ]
        .join(' ')
        .toLocaleLowerCase('es');

      const matchesSearch = query === '' || searchableText.includes(query);
      const matchesStatus = status === 'all' || promotion.status === status;
      const matchesType = type === 'all' || promotion.type === type;

      return matchesSearch && matchesStatus && matchesType;
    });
  });

  constructor() {
    this.loadData();
  }

  loadData(showMainLoading = true): void {
    if (showMainLoading) {
      this.loading.set(true);
    }

    forkJoin({
      promotions: this.promotionsApi.promotions(),
      categories: this.catalogApi.categories(),
      sizes: this.catalogApi.sizes(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.promotions.set(
            this.sortPromotions(response.promotions.data ?? []),
          );
          this.categories.set(response.categories.data ?? []);
          this.sizes.set(response.sizes.data ?? []);
        },
        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se cargaron las promociones',
            detail: this.errorMessage(error),
            life: 4500,
          });
        },
      });
  }

  refresh(): void {
    if (this.refreshing() || this.dialogSaving()) {
      return;
    }

    this.refreshing.set(true);
    this.loadData(false);
  }

  onSearch(value: string): void {
    this.search.set(value ?? '');
  }

  clearFilters(): void {
    this.search.set('');
    this.selectedStatus.set('all');
    this.selectedType.set('all');
  }

  openNewPromotion(): void {
    this.editingPromotion.set(null);
    this.dialogVisible.set(true);
  }

  openEditPromotion(promotion: AdminPromotion): void {
    this.editingPromotion.set(promotion);
    this.dialogVisible.set(true);
  }

  onDialogVisibleChange(visible: boolean): void {
    this.dialogVisible.set(visible);

    if (!visible) {
      this.editingPromotion.set(null);
    }
  }

  onPromotionSaved(saved: AdminPromotion): void {
    const exists = this.promotions().some(item => item.id === saved.id);

    this.promotions.update(current =>
      this.sortPromotions(
        exists
          ? current.map(item => (item.id === saved.id ? saved : item))
          : [...current, saved],
      ),
    );

    this.editingPromotion.set(null);
  }

  confirmVisibility(promotion: AdminPromotion): void {
    const willActivate = !promotion.is_active;

    if (willActivate && !promotion.can_activate) {
      this.messages.add({
        severity: 'warn',
        summary: 'Promoción incompleta',
        detail:
          'Completa la configuración y los precios antes de activarla.',
        life: 4200,
      });
      return;
    }

    this.confirmation.confirm({
      header: willActivate ? 'Activar promoción' : 'Desactivar promoción',
      message: willActivate
        ? `¿Activar “${promotion.name}”? Estará disponible durante su vigencia.`
        : `¿Desactivar “${promotion.name}”? Dejará de mostrarse al cliente.`,
      icon: willActivate ? 'pi pi-check-circle' : 'pi pi-pause-circle',
      acceptLabel: willActivate ? 'Activar' : 'Desactivar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: {
        severity: willActivate ? 'success' : 'warn',
      },
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.updateVisibility(promotion, willActivate),
    });
  }

  confirmDelete(promotion: AdminPromotion): void {
    if (!promotion.can_delete) {
      this.messages.add({
        severity: 'warn',
        summary: 'Promoción protegida',
        detail:
          'Esta promoción tiene carritos o pedidos asociados. Debes desactivarla en lugar de eliminarla.',
        life: 4500,
      });
      return;
    }

    this.confirmation.confirm({
      header: 'Eliminar promoción',
      message: `¿Eliminar definitivamente “${promotion.name}”? Esta acción no se puede deshacer.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: {
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.deletePromotion(promotion),
    });
  }

  private typeLabel(promotion: AdminPromotion): string {
    return promotion.type === 'fixed_combo'
      ? 'Combo fijo'
      : 'Precio por tamaño';
  }

  private updateVisibility(
    promotion: AdminPromotion,
    isActive: boolean,
  ): void {
    if (this.changingVisibilityId() !== null) {
      return;
    }

    this.changingVisibilityId.set(promotion.id);

    this.promotionsApi
      .updateVisibility(promotion.id, { is_active: isActive })
      .pipe(
        finalize(() => this.changingVisibilityId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.promotions.update(current =>
            this.sortPromotions(
              current.map(item =>
                item.id === response.data.id ? response.data : item,
              ),
            ),
          );

          this.messages.add({
            severity: 'success',
            summary: isActive
              ? 'Promoción activada'
              : 'Promoción desactivada',
            detail: response.message,
            life: 3000,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se cambió el estado',
            detail: this.errorMessage(error),
            life: 4500,
          });
        },
      });
  }

  private deletePromotion(promotion: AdminPromotion): void {
    if (this.deletingId() !== null) {
      return;
    }

    this.deletingId.set(promotion.id);

    this.promotionsApi
      .deletePromotion(promotion.id)
      .pipe(
        finalize(() => this.deletingId.set(null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          this.promotions.update(current =>
            current.filter(item => item.id !== promotion.id),
          );

          this.messages.add({
            severity: 'success',
            summary: 'Promoción eliminada',
            detail: response.message,
            life: 3000,
          });
        },
        error: (error: HttpErrorResponse) => {
          this.messages.add({
            severity: 'error',
            summary: 'No se eliminó la promoción',
            detail: this.errorMessage(error),
            life: 4500,
          });
        },
      });
  }

  private sortPromotions(promotions: AdminPromotion[]): AdminPromotion[] {
    return [...promotions].sort((a, b) => {
      if (a.is_active !== b.is_active) {
        return a.is_active ? -1 : 1;
      }

      return a.name.localeCompare(b.name, 'es');
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    const response = error.error as
      | AdminPromotionValidationErrorResponse
      | undefined;
    const errors = response?.errors;

    if (errors) {
      const firstErrorGroup = Object.values(errors)[0];
      const firstValidationError = firstErrorGroup?.[0];

      if (typeof firstValidationError === 'string') {
        return firstValidationError;
      }
    }

    if (typeof response?.message === 'string') {
      return response.message;
    }

    return 'Ocurrió un error al comunicarse con el servidor.';
  }
}
