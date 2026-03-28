import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SafeStorageService {
  private mem = new Map<string, string>();

  private get ls(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  getItem(key: string): string | null {
    const s = this.ls;
    if (s) {
      try {
        return s.getItem(key);
      } catch {
        // ignore
      }
    }
    return this.mem.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    const v = String(value);
    const s = this.ls;
    if (s) {
      try {
        s.setItem(key, v);
        return;
      } catch {
        // ignore
      }
    }
    this.mem.set(key, v);
  }

  removeItem(key: string): void {
    const s = this.ls;
    if (s) {
      try {
        s.removeItem(key);
      } catch {
        // ignore
      }
    }
    this.mem.delete(key);
  }
}
