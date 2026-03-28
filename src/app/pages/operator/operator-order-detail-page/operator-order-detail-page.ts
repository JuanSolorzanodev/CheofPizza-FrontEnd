import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { OperatorRealtimeService } from '../../../core/realtime/operator-realtime.service';
import { OperatorOrdersApiService } from '../../../core/api/operator/operator-orders-api.service';
import { KitchenItemDto, OperatorOrderDetailDto } from '../../../core/api/operator/operator-orders.models';
import {
  formatOperatorDate,
  prettyDeliveryType,
  prettyOperatorStatus,
  prettyPaymentMethod,
} from '../operator-order-ui.utils';

type TagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast'
  | null
  | undefined;

@Component({
  selector: 'app-operator-order-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    CardModule,
    ButtonModule,
    TextareaModule,
    SelectModule,
    TagModule,
    SkeletonModule,
  ],
  templateUrl: './operator-order-detail-page.html',
  styleUrl: './operator-order-detail-page.scss',
})
export class OperatorOrderDetailPage {
  private readonly api = inject(OperatorOrdersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly realtime = inject(OperatorRealtimeService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly order = signal<OperatorOrderDetailDto | null>(null);

  readonly orderId = computed(() => Number(this.route.snapshot.paramMap.get('orderId') ?? '0'));

  readonly statuses = signal<string[]>([]);
  toStatus = '';
  note = '';

  constructor() {
    this.loadStatuses();
    this.load();

    const id = this.orderId();

    this.realtime.listenOrder(id, (payload) => {
      const detail = payload?.detail ?? null;

      if (detail && Number(detail.id) === id) {
        this.order.set(detail);
        this.toStatus = detail.status ?? '';
      } else {
        this.load();
      }
    });
  }

  loadStatuses(): void {
    this.api.statuses().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => this.statuses.set(res?.data ?? []),
      error: () => this.statuses.set([]),
    });
  }

  load(): void {
    this.loading.set(true);

    const id = this.orderId();
    this.api.show(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        const data = res?.data ?? null;
        this.order.set(data);
        this.toStatus = data?.status ?? '';
        this.note = '';
      },
      error: () => this.order.set(null),
      complete: () => this.loading.set(false),
    });
  }

  onStatusChange(nextStatus: string): void {
    const current = this.order();

    if (!current) return;
    if (!nextStatus || nextStatus === current.status) {
      this.toStatus = current.status;
      return;
    }

    this.saving.set(true);

    this.api
      .updateStatus(current.id, nextStatus, this.note?.trim() || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const updated = res?.data ?? null;
          this.order.set(updated);
          this.toStatus = updated?.status ?? current.status;
          this.note = '';
        },
        error: () => {
          this.toStatus = current.status;
        },
        complete: () => this.saving.set(false),
      });
  }

  openDeliveryWhatsApp(): void {
    const url = this.order()?.delivery_whatsapp_url?.trim();

    if (!url) return;
    if (typeof window === 'undefined') return;

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  itemMeta(it: KitchenItemDto): string {
    return [it.size_name, it.category_name]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join(' · ');
  }

  prettyStatus(s: string): string {
    return prettyOperatorStatus(s);
  }

  prettyDeliveryType(value: string): string {
    return prettyDeliveryType(value);
  }

  prettyPaymentMethod(value: string): string {
    return prettyPaymentMethod(value);
  }

  formatDate(value: string | null): string {
    return formatOperatorDate(value);
  }

  statusSeverity(s: string): TagSeverity {
    if (s === 'pending') return 'warn';
    if (s === 'confirmed') return 'info';
    if (s === 'preparing') return 'warn';
    if (s === 'ready') return 'success';
    if (s === 'on_the_way') return 'info';
    if (s === 'delivered') return 'success';
    if (s === 'cancelled') return 'danger';
    return 'secondary';
  }

  statusOptions(): Array<{ label: string; value: string }> {
    return (this.statuses() ?? []).map((s) => ({
      value: s,
      label: this.prettyStatus(s),
    }));
  }

  trackItem = (_: number, it: KitchenItemDto) => it.id;

  ingredientsLabel(list?: unknown): string {
    if (!list) return '—';

    if (typeof list === 'string') {
      const s = list.trim();
      return s.length ? s : '—';
    }

    if (Array.isArray(list)) {
      if (!list.length) return '—';

      if (typeof list[0] === 'string') {
        return (list as string[]).filter(Boolean).join(', ') || '—';
      }

      const names = (list as any[])
        .map((x) => x?.name ?? x?.ingredient_name ?? x?.title ?? x?.label ?? '')
        .filter((x) => typeof x === 'string' && x.trim().length > 0);

      return names.length ? names.join(', ') : '—';
    }

    return '—';
  }

  personalizationText(p: any): string {
    const side = p?.applies_to && p.applies_to !== 'ALL' ? ` (${p.applies_to})` : '';
    const price = p?.extra_price ? ` +$${Number(p.extra_price).toFixed(2)}` : '';
    return `${p?.action ?? ''}: ${p?.ingredient_name ?? ''}${side}${price}`.trim();
  }

  ngOnDestroy(): void {
    this.realtime.stopOrder(this.orderId());
  }
}
