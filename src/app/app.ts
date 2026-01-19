import { Component, signal, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toolbar } from './shared/components/toolbar/toolbar';
import { CartStore } from './core/api/cart/cart.store';
import { ToastModule } from 'primeng/toast';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toolbar,ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('CheofPizza_Front');
  private readonly cart = inject(CartStore);

  constructor() {
    this.cart.hydrate();
  }
}
