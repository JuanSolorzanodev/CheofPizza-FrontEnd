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
    this.apply(
      this.resolveInitialMode(),
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
    const root =
      this.document
        .documentElement;

    this.mode.set(
      mode,
    );

    root.classList.toggle(
      'cheof-dark',
      mode === 'dark',
    );

    root.dataset['theme'] =
      mode;

    root.style.colorScheme =
      mode;

    this.updateThemeColor(
      mode,
    );

    if (persist) {
      this.storage.setItem(
        this.storageKey,
        mode,
      );
    }
  }

  private updateThemeColor(
    mode: ThemeMode,
  ): void {
    const meta =
      this.document
        .querySelector<HTMLMetaElement>(
          'meta[name="theme-color"]',
        );

    if (!meta) {
      return;
    }

    meta.content =
      mode === 'dark'
        ? '#09100b'
        : '#f8faf8';
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
