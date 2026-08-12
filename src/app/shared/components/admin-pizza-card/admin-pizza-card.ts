import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminPizza } from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-pizza-card',
  standalone: true,
  imports: [
    ButtonModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-pizza-card.html',
  styleUrl: './admin-pizza-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPizzaCardComponent {
  readonly pizza = input.required<AdminPizza>();
  readonly changingVisibility = input(false);
  readonly deleting = input(false);
  readonly actionsDisabled = input(false);

  readonly edit = output<AdminPizza>();
  readonly visibilityChange = output<AdminPizza>();
  readonly delete = output<AdminPizza>();

  usageLabel(): string {
    const total = this.pizza().usage?.total ?? 0;

    if (total === 0) {
      return 'Sin uso registrado';
    }

    return total === 1
      ? '1 registro asociado'
      : `${total} registros asociados`;
  }
}
