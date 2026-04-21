import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';

type Banner = {
  imageUrl: string;
  alt: string;
  promotionSlug: string;
  title: string;
  subtitle: string;
};

@Component({
  selector: 'app-carousel-component',
  imports: [CarouselModule, ButtonModule],
  standalone: true,
  templateUrl: './carousel-component.html',
  styleUrl: './carousel-component.scss',
})
export class CarouselComponent {
  private readonly router = inject(Router);

  readonly banners: Banner[] = [
    {
      imageUrl: 'https://res.cloudinary.com/dertc9kiq/image/upload/v1766279154/cheofbanner_jn6lak.png',
      alt: 'Promoción 2x1 Familiar',
      promotionSlug: '2x1-familiar',
      title: '2x1 Familiar',
      subtitle: '1 Especial + 1 Sencilla por $20',
    },
    {
      imageUrl: 'https://res.cloudinary.com/dertc9kiq/image/upload/v1766279154/cheofbanner2_acgkhf.png',
      alt: 'Promoción 2x1 Mediana',
      promotionSlug: '2x1-mediana',
      title: '2x1 Mediana',
      subtitle: '1 Especial + 1 Sencilla por $15',
    },
  ];

  goToPromotion(slug: string): void {
    this.router.navigate(['/promociones', slug]);
  }
}
