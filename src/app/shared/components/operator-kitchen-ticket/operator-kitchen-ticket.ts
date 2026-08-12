import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardModule } from 'primeng/card';

import {
  KitchenItemDto,
  KitchenPersonalizationDto,
  KitchenPromotionPizzaDto,
} from '../../../core/api/operator/operator-orders.models';

@Component({
  selector: 'app-operator-kitchen-ticket',
  standalone: true,
  imports: [CardModule],
  templateUrl: './operator-kitchen-ticket.html',
  styleUrl: './operator-kitchen-ticket.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorKitchenTicket {
  readonly items = input.required<readonly KitchenItemDto[]>();

  readonly trackItem = (_: number, item: KitchenItemDto): number => item.id;

  itemMeta(item: KitchenItemDto): string {
    return [item.size_name, item.category_name]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' · ');
  }

  ingredientsLabel(list?: unknown): string {
    if (!list) return '—';
    if (typeof list === 'string') return list.trim() || '—';
    if (!Array.isArray(list) || list.length === 0) return '—';
    if (typeof list[0] === 'string') return (list as string[]).filter(Boolean).join(', ') || '—';

    const names = (list as Record<string, unknown>[])
      .map(
        (item) => item['name'] ?? item['ingredient_name'] ?? item['title'] ?? item['label'] ?? '',
      )
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    return names.length > 0 ? names.join(', ') : '—';
  }

  promotionPizzaPersonalizations(
    item: KitchenItemDto,
    pizza: KitchenPromotionPizzaDto,
  ): KitchenPersonalizationDto[] {
    return (item.personalizations ?? []).filter(
      (personalization) => Number(personalization.order_promotion_item_id) === Number(pizza.id),
    );
  }

  unassignedPromotionPersonalizations(item: KitchenItemDto): KitchenPersonalizationDto[] {
    if (item.type !== 'promotion' || !item.promotion) return [];
    const promotionItemIds = new Set(item.promotion.pizzas.map((pizza) => Number(pizza.id)));
    return (item.personalizations ?? []).filter((personalization) => {
      const id = personalization.order_promotion_item_id;
      return id == null || !promotionItemIds.has(Number(id));
    });
  }

  personalizationText(personalization: {
    applies_to?: string;
    extra_price?: number;
    action?: string;
    ingredient_name?: string;
  }): string {
    const side =
      personalization.applies_to && personalization.applies_to !== 'ALL'
        ? ` (${personalization.applies_to})`
        : '';
    const price = personalization.extra_price
      ? ` +$${Number(personalization.extra_price).toFixed(2)}`
      : '';
    return `${personalization.action ?? ''}: ${personalization.ingredient_name ?? ''}${side}${price}`.trim();
  }
}
