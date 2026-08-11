import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

import { ScrollService } from '../../ui/scroll.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly router =
    inject(Router);

  private readonly scrollService =
    inject(ScrollService);

  private readonly headerOffset = 82;

  readonly currentYear =
    new Date().getFullYear();

  goToHome(): void {
    void this.router.navigateByUrl('/');
  }

  goToSencillas(): void {
    this.navigateHomeAndScroll(
      'menu-sencillas',
    );
  }

  goToEspeciales(): void {
    this.navigateHomeAndScroll(
      'menu-especiales',
    );
  }

  goToPromotions(): void {
    this.navigateHomeAndScroll(
      'promotions',
    );
  }

  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  private navigateHomeAndScroll(
    elementId: string,
  ): void {
    const isHome =
      this.router.url === '/' ||
      this.router.url.startsWith('/?') ||
      this.router.url.startsWith('/#');

    if (isHome) {
      this.scrollService.scrollToId(
        elementId,
        this.headerOffset,
      );

      return;
    }

    void this.router
      .navigateByUrl('/')
      .then(navigated => {
        if (!navigated) {
          return;
        }

        window.setTimeout(() => {
          this.scrollService.scrollToId(
            elementId,
            this.headerOffset,
          );
        }, 120);
      });
  }
}
