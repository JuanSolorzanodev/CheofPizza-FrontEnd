import { Injectable, signal } from '@angular/core';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'cheof_theme';
  readonly mode = signal<ThemeMode>(this.getInitialMode());

  constructor() {
    this.apply(this.mode());
  }

  toggle(): void {
    const next: ThemeMode = this.mode() === 'dark' ? 'light' : 'dark';
    this.mode.set(next);
    this.apply(next);
    localStorage.setItem(this.storageKey, next);
  }

  private apply(mode: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('cheof-dark', mode === 'dark');
  }

  private getInitialMode(): ThemeMode {
    const saved = localStorage.getItem(this.storageKey) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;

    // Si no hay preferencia guardada, usa el esquema del sistema
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
    return prefersDark ? 'dark' : 'light';
  }
}
