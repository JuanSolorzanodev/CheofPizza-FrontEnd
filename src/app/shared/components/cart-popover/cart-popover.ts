import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Popover, PopoverModule } from 'primeng/popover';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';
import { BadgeModule } from 'primeng/badge';
import { CartStore } from '../../../core/api/cart/cart.store';
import { RouterModule } from '@angular/router';

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
    DividerModule,
    InputNumberModule,
    BadgeModule,
  ],
  templateUrl: './cart-popover.html',
  styleUrl: './cart-popover.scss',
})
export class CartPopover {
  readonly cart = inject(CartStore);

  @ViewChild('op') op!: Popover;

  toggle(ev: Event): void {
    this.op.toggle(ev);
  }
}
