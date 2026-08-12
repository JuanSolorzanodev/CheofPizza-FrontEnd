import {
  Injectable,
  isDevMode,
} from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AppLoggerService {
  warn(
    message: string,
    context?: unknown,
  ): void {
    if (!isDevMode()) {
      return;
    }

    if (context === undefined) {
      console.warn(message);
      return;
    }

    console.warn(
      message,
      context,
    );
  }

  error(
    message: string,
    context?: unknown,
  ): void {
    if (!isDevMode()) {
      return;
    }

    if (context === undefined) {
      console.error(message);
      return;
    }

    console.error(
      message,
      context,
    );
  }
}
