import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CarouselComponent } from '../../../shared/components/carousel-component/carousel-component';
import { Menu } from '../../../shared/components/menu/menu/menu';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, CarouselComponent, Menu],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {

}
