import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  AdminCategory,
  AdminSize,
} from '../../../core/api/admin/catalog/admin-catalog.models';

export interface AdminPriceMatrixCell {
  categoryId: number;
  sizeId: number;
  originalPrice: number;
  currentPrice: number;
}

export interface AdminPriceMatrixChange {
  categoryId: number;
  sizeId: number;
  value: number | string | null;
}

export interface AdminPriceMatrixCellRef {
  categoryId: number;
  sizeId: number;
}

@Component({
  selector: 'app-admin-price-matrix',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputNumberModule,
    SkeletonModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-price-matrix.html',
  styleUrl: './admin-price-matrix.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPriceMatrixComponent {
  readonly loading = input(false);
  readonly saving = input(false);
  readonly categories = input.required<AdminCategory[]>();
  readonly sizes = input.required<AdminSize[]>();
  readonly cells = input.required<Record<string, AdminPriceMatrixCell>>();
  readonly changedKeys = input.required<ReadonlySet<string>>();

  readonly priceChange = output<AdminPriceMatrixChange>();
  readonly resetCell = output<AdminPriceMatrixCellRef>();
  readonly resetAll = output<void>();
  readonly save = output<void>();

  readonly hasChanges = computed(() => this.changedKeys().size > 0);
  readonly changedCount = computed(() => this.changedKeys().size);

  priceValue(categoryId: number, sizeId: number): number {
    return this.cells()[this.cellKey(categoryId, sizeId)]?.currentPrice ?? 0;
  }

  originalPrice(categoryId: number, sizeId: number): number {
    return this.cells()[this.cellKey(categoryId, sizeId)]?.originalPrice ?? 0;
  }

  isChanged(categoryId: number, sizeId: number): boolean {
    return this.changedKeys().has(this.cellKey(categoryId, sizeId));
  }

  isAvailable(categoryId: number, sizeId: number): boolean {
    return this.priceValue(categoryId, sizeId) > 0;
  }

  onPriceChange(
    categoryId: number,
    sizeId: number,
    value: number | string | null,
  ): void {
    this.priceChange.emit({ categoryId, sizeId, value });
  }

  onResetCell(categoryId: number, sizeId: number): void {
    this.resetCell.emit({ categoryId, sizeId });
  }

  money(value: number): string {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  private cellKey(categoryId: number, sizeId: number): string {
    return `${categoryId}:${sizeId}`;
  }
}
