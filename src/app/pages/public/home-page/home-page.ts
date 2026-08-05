import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import {
  CarouselComponent,
} from '../../../shared/components/carousel-component/carousel-component';
import {
  Menu,
} from '../../../shared/components/menu/menu';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CarouselComponent,
    Menu,
  ],
  templateUrl:
    './home-page.html',
  styleUrl:
    './home-page.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
