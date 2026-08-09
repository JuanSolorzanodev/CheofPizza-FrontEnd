import {
  DOCUMENT,
} from '@angular/common';

import {
  Injectable,
  inject,
  signal,
} from '@angular/core';

import {
  SafeStorageService,
} from './safe-storage.service';

export type ThemeMode =
  | 'light'
  | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document =
    inject(DOCUMENT);

  private readonly storage =
    inject(SafeStorageService);

  private readonly storageKey =
    'cheof_theme';

  readonly mode =
    signal<ThemeMode>(
      'light',
    );

  constructor() {
    const initialMode =
      this.resolveInitialMode();

    this.apply(
      initialMode,
      false,
    );
  }

  toggle(): void {
    this.setMode(
      this.mode() === 'dark'
        ? 'light'
        : 'dark',
    );
  }

  setMode(
    mode: ThemeMode,
  ): void {
    this.apply(
      mode,
      true,
    );
  }

  private apply(
    mode: ThemeMode,
    persist: boolean,
  ): void {
    this.mode.set(
      mode,
    );

    const root =
      this.document
        .documentElement;

    root.classList.toggle(
      'cheof-dark',
      mode === 'dark',
    );

    root.dataset['theme'] =
      mode;

    root.style.colorScheme =
      mode;

    if (persist) {
      this.storage.setItem(
        this.storageKey,
        mode,
      );
    }
  }

  private resolveInitialMode():
    ThemeMode {
    const saved =
      this.storage.getItem(
        this.storageKey,
      );

    if (
      saved === 'light' ||
      saved === 'dark'
    ) {
      return saved;
    }

    const windowRef =
      this.document
        .defaultView;

    if (!windowRef) {
      return 'light';
    }

    return windowRef
      .matchMedia(
        '(prefers-color-scheme: dark)',
      )
      .matches
      ? 'dark'
      : 'light';
  }
}
