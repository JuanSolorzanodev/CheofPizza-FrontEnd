import { Injectable } from '@angular/core';
import { SafeStorageService } from '../../state/safe-storage.service';

@Injectable({ providedIn: 'root' })
export class CartSessionService {
  private readonly key = 'cheof_cart_session';

  constructor(private readonly storage: SafeStorageService) {}

  get(): string | null {
    return this.storage.getItem(this.key);
  }

  set(id: string): void {
    if (!id) return;
    this.storage.setItem(this.key, id);
  }

  clear(): void {
    this.storage.removeItem(this.key);
  }
}
