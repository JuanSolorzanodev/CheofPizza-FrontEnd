import { Injectable, signal } from '@angular/core';
import { SafeStorageService } from './safe-storage.service';

type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'cheof_theme';
  readonly mode = signal<ThemeMode>('light');

  constructor(private readonly storage: SafeStorageService) {
    const initial = this.getInitialMode();
    this.mode.set(initial);
    this.apply(initial);
  }

  toggle(): void {
    const next: ThemeMode = this.mode() === 'dark' ? 'light' : 'dark';
    this.mode.set(next);
    this.apply(next);
    this.storage.setItem(this.storageKey, next);
  }

  private apply(mode: ThemeMode): void {
    // si document no existe (SSR o context raro), no revientes
    try {
      document.documentElement.classList.toggle('cheof-dark', mode === 'dark');
    } catch {
      // ignore
    }
  }

  private getInitialMode(): ThemeMode {
    const saved = this.storage.getItem(this.storageKey) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark') return saved;

    try {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
      return prefersDark ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }
}
