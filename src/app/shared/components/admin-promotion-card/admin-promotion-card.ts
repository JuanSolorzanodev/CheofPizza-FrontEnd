import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  AdminPromotion,
  AdminPromotionStatus,
} from '../../../core/api/admin/promotions/admin-promotions.models';

@Component({
  selector: 'app-admin-promotion-card',
  standalone: true,
  imports: [
    ButtonModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-promotion-card.html',
  styleUrl: './admin-promotion-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPromotionCardComponent {
  readonly promotion = input.required<AdminPromotion>();
  readonly deleting = input(false);
  readonly changingVisibility = input(false);
  readonly actionsDisabled = input(false);

  readonly edit = output<AdminPromotion>();
  readonly visibilityChange = output<AdminPromotion>();
  readonly delete = output<AdminPromotion>();

  statusLabel(status: AdminPromotionStatus): string {
    const labels: Record<AdminPromotionStatus, string> = {
      active: 'Activa',
      scheduled: 'Programada',
      finished: 'Finalizada',
      inactive: 'Inactiva',
    };

    return labels[status];
  }

  statusSeverity(
    status: AdminPromotionStatus,
  ): 'success' | 'info' | 'warn' | 'secondary' {
    const severities: Record<
      AdminPromotionStatus,
      'success' | 'info' | 'warn' | 'secondary'
    > = {
      active: 'success',
      scheduled: 'info',
      finished: 'warn',
      inactive: 'secondary',
    };

    return severities[status];
  }

  typeLabel(promotion: AdminPromotion): string {
    return promotion.type === 'fixed_combo'
      ? 'Combo fijo'
      : 'Precio por tamaño';
  }

  promotionPrice(promotion: AdminPromotion): string {
    if (promotion.type === 'fixed_combo') {
      return this.formatMoney(promotion.price);
    }

    if (promotion.size_prices.length === 0) {
      return 'Sin precios';
    }

    return promotion.size_prices
      .map(
        sizePrice =>
          `${sizePrice.size?.name ?? 'Tamaño'} ${this.formatMoney(sizePrice.price)}`,
      )
      .join(' · ');
  }

  promotionRules(promotion: AdminPromotion): string {
    if (promotion.type === 'size_fixed_price') {
      return promotion.size_prices
        .map(
          item =>
            `${item.size?.name ?? 'Tamaño'}: ${this.formatMoney(item.price)}`,
        )
        .join(' · ');
    }

    if (promotion.details.length === 0) {
      return 'Sin reglas configuradas';
    }

    return promotion.details
      .map(detail => {
        const category = detail.category?.name ?? 'Categoría';
        const size = detail.size?.name ?? 'Tamaño';
        return `${detail.required_quantity} ${category} · ${size}`;
      })
      .join(' + ');
  }

  validityText(promotion: AdminPromotion): string {
    if (!promotion.starts_at || !promotion.ends_at) {
      return 'Vigencia no configurada';
    }

    return `${this.formatDateTime(promotion.starts_at)} — ${this.formatDateTime(promotion.ends_at)}`;
  }

  usageLabel(promotion: AdminPromotion): string {
    const total = promotion.usage.total;

    if (total === 0) {
      return 'Sin uso registrado';
    }

    return total === 1 ? '1 asociación' : `${total} asociaciones`;
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  private formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  }
}
