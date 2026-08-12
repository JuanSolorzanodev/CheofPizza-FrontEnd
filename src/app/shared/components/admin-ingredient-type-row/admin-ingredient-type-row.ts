import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import { AdminIngredientType } from '../../../core/api/admin/catalog/admin-catalog.models';

@Component({
  selector: 'app-admin-ingredient-type-row',
  standalone: true,
  imports: [ButtonModule, TagModule, TooltipModule],
  templateUrl: './admin-ingredient-type-row.html',
  styleUrl: './admin-ingredient-type-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminIngredientTypeRowComponent {
  readonly type = input.required<AdminIngredientType>();
  readonly deleting = input(false);
  readonly actionsDisabled = input(false);

  readonly edit = output<AdminIngredientType>();
  readonly delete = output<AdminIngredientType>();
}
