import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';

import { CartStore } from '../../../core/api/cart/cart.store';

@Component({
  selector: 'app-cart-popover',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CurrencyPipe,
    PopoverModule,
    ButtonModule,
    BadgeModule,
  ],
  templateUrl: './cart-popover.html',
  styleUrls: ['./cart-popover.scss'], // <- plural, estable
})
export class CartPopover {
  readonly cart = inject(CartStore);

  @ViewChild('op') op!: Popover;

  /**
   * Toggle anclado al botón (NO usa $event).
   * Evita el 99% de errores de tipado/eventos que "matan" el componente.
   */
  toggle(btn: any): void {
    const el = btn?.el?.nativeElement ?? btn?.nativeElement ?? btn;
    this.op.toggle({ currentTarget: el } as any);
  }
}
