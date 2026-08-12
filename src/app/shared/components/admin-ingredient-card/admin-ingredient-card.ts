import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminIngredient } from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-ingredient-card',
  standalone: true,
  imports: [ButtonModule, TagModule, TooltipModule],
  templateUrl: './admin-ingredient-card.html',
  styleUrl: './admin-ingredient-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredientCardComponent {
  readonly ingredient = input.required<AdminIngredient>();
  readonly deleting = input(false);
  readonly actionsDisabled = input(false);

  readonly edit = output<AdminIngredient>();
  readonly prices = output<AdminIngredient>();
  readonly delete = output<AdminIngredient>();

  usageText(): string {
    const ingredient = this.ingredient();
    const parts: string[] = [];

    const pizzas = ingredient.usage.pizzas;
    const carts = ingredient.usage.cart_personalizations;
    const orders = ingredient.usage.order_personalizations;

    if (pizzas > 0) parts.push(`${pizzas} ${pizzas === 1 ? 'pizza' : 'pizzas'}`);
    if (carts > 0) parts.push(`${carts} ${carts === 1 ? 'carrito' : 'carritos'}`);
    if (orders > 0) parts.push(`${orders} ${orders === 1 ? 'pedido' : 'pedidos'}`);

    return parts.length ? parts.join(' · ') : 'Sin asociaciones';
  }

  priceRange(): string {
    const prices = this.ingredient().prices;
    if (!prices.length) return 'Sin precios';

    const values = prices.map((price) => Number(price.extra_price));
    const min = Math.min(...values);
    const max = Math.max(...values);

    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} – $${max.toFixed(2)}`;
  }
}
