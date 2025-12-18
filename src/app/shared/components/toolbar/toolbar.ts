import { Component, computed, inject } from '@angular/core';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../core/state/theme.service';

type PizzaCategory = 'simple' | 'special';

@Component({
  selector: 'app-toolbar',
  imports: [ToolbarModule, ButtonModule,SelectButtonModule, FormsModule],
  standalone:true,
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss',
})
export class Toolbar {
  private readonly theme = inject(ThemeService);

    readonly mode = this.theme.mode;
    readonly themeIcon = computed(() => (this.mode() === 'dark' ? 'pi pi-sun' : 'pi pi-moon'));

     // Mobile select
  pizzaCategory: PizzaCategory = 'simple';
  readonly pizzaCategoryOptions = [
    { label: 'Sencillas', value: 'simple', icon: 'pi pi-star' },
    { label: 'Especiales', value: 'special', icon: 'pi pi-bolt' },
  ];

    onCategoryChange(value: PizzaCategory) {
    this.pizzaCategory = value;

  }

    toggleTheme(): void {
      this.theme.toggle();
    }

}
