import {
  Injectable,
  inject,
} from '@angular/core';

import {
  SafeStorageService,
} from '../../state/safe-storage.service';

@Injectable({
  providedIn: 'root',
})
export class CartSessionService {
  private readonly storage =
    inject(SafeStorageService);

  private readonly storageKey =
    'cheof_cart_session';

  get(): string | null {
    const value =
      this.storage.getItem(
        this.storageKey,
      );

    const normalized =
      value?.trim() ?? '';

    return normalized !== ''
      ? normalized
      : null;
  }

  set(sessionId: string): void {
    const normalized =
      sessionId.trim();

    if (normalized === '') {
      return;
    }

    this.storage.setItem(
      this.storageKey,
      normalized,
    );
  }

  clear(): void {
    this.storage.removeItem(
      this.storageKey,
    );
  }
}
