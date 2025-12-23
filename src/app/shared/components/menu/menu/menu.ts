import { PizzaDto } from './../../../../core/api/catalog/catalog.models';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';

import { DataView } from 'primeng/dataview';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton'; // ✅

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogApiService } from '../../../../core/api/catalog/catalog-api.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, DataView, ButtonModule, SkeletonModule], // ✅
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu {
  private readonly api = inject(CatalogApiService);
  private readonly destroyRef = inject(DestroyRef);

  // DATA
  readonly sencillas = signal<PizzaDto[]>([]);
  readonly especiales = signal<PizzaDto[]>([]);

  // STATE
  readonly loadingSencillas = signal<boolean>(true);
  readonly loadingEspeciales = signal<boolean>(true);

  readonly errorSencillas = signal<string | null>(null);
  readonly errorEspeciales = signal<string | null>(null);

  // ✅ Para renderizar 6 skeleton cards (2 filas de 3)
  readonly skeletonItems = Array.from({ length: 6 }, (_, i) => i);

  // Fallback si no hay imagen
  readonly fallbackImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
        <rect width="800" height="500" fill="#f2f2f2"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              fill="#666" font-family="Arial" font-size="28">
          Sin imagen
        </text>
      </svg>`
    );

  constructor() {
    this.loadSencillas();
    this.loadEspeciales();
  }

  private loadSencillas(): void {
    this.loadingSencillas.set(true);
    this.errorSencillas.set(null);

    this.api.getPizzasSencillas()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingSencillas.set(false))
      )
      .subscribe({
        next: (data) => this.sencillas.set(data),
        error: (e: Error) => this.errorSencillas.set(e.message),
      });
  }

  private loadEspeciales(): void {
    this.loadingEspeciales.set(true);
    this.errorEspeciales.set(null);

    this.api.getPizzasEspeciales()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingEspeciales.set(false))
      )
      .subscribe({
        next: (data) => this.especiales.set(data),
        error: (e: Error) => this.errorEspeciales.set(e.message),
      });
  }

  onOrder(pizza: PizzaDto): void {
    console.log('ORDENAR:', pizza);
  }

  trackById = (_: number, p: PizzaDto) => p.id;
}
