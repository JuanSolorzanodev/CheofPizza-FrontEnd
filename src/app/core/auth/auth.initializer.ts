import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

export function initializeAuthSession(): Promise<void> {
  return inject(AuthStore).initialize();
}
