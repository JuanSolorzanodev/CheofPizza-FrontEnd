import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';

type Banner = {
  imageUrl: string;
  alt?: string;
};

@Component({
  selector: 'app-carousel-component',
  imports: [CarouselModule,ButtonModule],
  standalone: true,
  templateUrl: './carousel-component.html',
  styleUrl: './carousel-component.scss',
})
export class CarouselComponent {


    banners: Banner[] = [
    {
      imageUrl: 'https://res.cloudinary.com/dertc9kiq/image/upload/v1766279154/cheofbanner_jn6lak.png',
      alt: 'CheoF Banner 1',
    },
        {
      imageUrl: 'https://res.cloudinary.com/dertc9kiq/image/upload/v1766279154/cheofbanner2_acgkhf.png',
      alt: 'CheoF Banner 2',
    },

      ];

}
