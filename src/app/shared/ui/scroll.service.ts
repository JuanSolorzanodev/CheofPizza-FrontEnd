import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ScrollService {
  /**
   * Desplaza suavemente a un elemento por id.
   * offsetPx: útil si tu toolbar es fixed y tapa el título.
   */
  scrollToId(id: string, offsetPx = 0): void {
    const el = document.getElementById(id);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - offsetPx;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
}
