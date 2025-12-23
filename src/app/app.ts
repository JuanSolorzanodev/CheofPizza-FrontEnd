import { Component, signal, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toolbar } from './shared/components/toolbar/toolbar';
import { CarouselComponent } from "./shared/components/carousel-component/carousel-component";
import { Menu } from './shared/components/menu/menu/menu';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toolbar, CarouselComponent,Menu],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('CheofPizza_Front');

}
