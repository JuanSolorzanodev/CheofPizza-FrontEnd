import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import {
  CarouselComponent,
} from '../../../shared/components/carousel-component/carousel-component';

import {
  FooterComponent,
} from '../../../shared/components/footer/footer';

import {
  Menu,
} from '../../../shared/components/menu/menu';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CarouselComponent,
    Menu,
    FooterComponent,
  ],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
