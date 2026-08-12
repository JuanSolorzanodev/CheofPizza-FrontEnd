import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollService {
  private readonly document = inject(DOCUMENT);

  /**
   * Desplaza suavemente a un elemento por id.
   * offsetPx es útil cuando una barra fija puede cubrir el destino.
   */
  scrollToId(id: string, offsetPx = 0): void {
    const element = this.document.getElementById(id);
    const windowRef = this.document.defaultView;

    if (!element || !windowRef) {
      return;
    }

    const y = element.getBoundingClientRect().top + windowRef.scrollY - offsetPx;

    windowRef.scrollTo({
      top: y,
      behavior: 'smooth',
    });
  }
}
