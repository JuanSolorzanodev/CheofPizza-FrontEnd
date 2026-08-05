import { CurrencyPipe, DatePipe } from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';

import { RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';

import { DatePickerModule } from 'primeng/datepicker';

import { DialogModule } from 'primeng/dialog';

import { DrawerModule } from 'primeng/drawer';

import { InputTextModule } from 'primeng/inputtext';

import { PaginatorModule, PaginatorState } from 'primeng/paginator';

import { SelectModule } from 'primeng/select';

import { SkeletonModule } from 'primeng/skeleton';

import { TableModule } from 'primeng/table';

import { TagModule } from 'primeng/tag';

import { TooltipModule } from 'primeng/tooltip';

import { AdminPaymentTransactionsApiService } from '../../../core/api/admin/payment-transactions/admin-payment-transactions-api.service';

import {
  AdminApiValidationError,
  AdminPaymentMethod,
  AdminPaymentTransaction,
  AdminPaymentTransactionStatus,
  AdminPaymentTransactionSummary,
} from '../../../core/api/admin/payment-transactions/admin-payment-transactions.models';

interface SelectOption<T> {
  label: string;
  value: T;
}

type TagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

@Component({
  selector: 'app-admin-payment-transactions',

  standalone: true,

  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    ButtonModule,
    DatePickerModule,
    DialogModule,
    DrawerModule,
    InputTextModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],

  templateUrl: './admin-payment-transactions.html',

  styleUrl: './admin-payment-transactions.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentTransactions {
  private readonly api = inject(AdminPaymentTransactionsApiService);

  private readonly messages = inject(MessageService);

  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);

  readonly filtersDrawerVisible = signal(false);

  readonly detailVisible = signal(false);

  readonly transactions = signal<AdminPaymentTransaction[]>([]);

  readonly selectedTransaction = signal<AdminPaymentTransaction | null>(null);

  readonly summary = signal<AdminPaymentTransactionSummary | null>(null);

  readonly total = signal(0);

  readonly page = signal(1);

  readonly perPage = signal(15);

  readonly dateFrom = signal<Date | null>(this.startOfCurrentMonth());

  readonly dateTo = signal<Date | null>(new Date());

  readonly method = signal<AdminPaymentMethod | null>(null);

  readonly status = signal<AdminPaymentTransactionStatus | null>(null);

  readonly search = signal('');

  readonly methodOptions: SelectOption<AdminPaymentMethod | null>[] = [
    {
      label: 'Todos los métodos',

      value: null,
    },
    {
      label: 'Efectivo',

      value: 'cash',
    },
    {
      label: 'Transferencia',

      value: 'transfer',
    },
    {
      label: 'PayPal',

      value: 'paypal',
    },
  ];

  readonly statusOptions: SelectOption<AdminPaymentTransactionStatus | null>[] = [
    {
      label: 'Todos los estados',

      value: null,
    },
    {
      label: 'Cobrado',

      value: 'collected',
    },
    {
      label: 'Pendiente',

      value: 'pending',
    },
    {
      label: 'Aprobado',

      value: 'approved',
    },
    {
      label: 'Completado',

      value: 'completed',
    },
    {
      label: 'Rechazado',

      value: 'rejected',
    },
    {
      label: 'Creado',

      value: 'created',
    },
    {
      label: 'Denegado',

      value: 'denied',
    },
    {
      label: 'Fallido',

      value: 'failed',
    },
    {
      label: 'Cancelado',

      value: 'cancelled',
    },
    {
      label: 'Reembolsado',

      value: 'refunded',
    },
    {
      label: 'Reembolso parcial',

      value: 'partially_refunded',
    },
  ];

  readonly first = computed(() => (this.page() - 1) * this.perPage());

  readonly visibleFrom = computed(() => {
    if (this.total() === 0) {
      return 0;
    }

    return this.first() + 1;
  });

  readonly visibleTo = computed(() =>
    Math.min(
      this.page() * this.perPage(),

      this.total(),
    ),
  );

  readonly hasCustomFilters = computed(
    () => this.method() !== null || this.status() !== null || this.search().trim() !== '',
  );

  readonly activeFilterCount = computed(() => {
    let count = 0;

    if (this.method() !== null) {
      count++;
    }

    if (this.status() !== null) {
      count++;
    }

    if (this.search().trim() !== '') {
      count++;
    }

    return count;
  });

  readonly periodLabel = computed(() => {
    const from = this.dateFrom();

    const to = this.dateTo();

    if (!from || !to) {
      return 'Periodo personalizado';
    }

    return `${this.shortDate(from)} – ${this.shortDate(to)}`;
  });

  readonly hasFinancialAlerts = computed(
    () =>
      (this.summary()?.pending.transactions ?? 0) > 0 ||
      (this.summary()?.unsuccessful.transactions ?? 0) > 0,
  );

  constructor() {
    this.load();
  }

  load(): void {
    if (!this.hasValidDateRange()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Rango inválido',
        detail: 'La fecha inicial no puede ser posterior a la fecha final.',
      });

      return;
    }

    this.loading.set(true);

    this.api
      .getTransactions({
        date_from: this.formatDate(this.dateFrom()),

        date_to: this.formatDate(this.dateTo()),

        timezone: 'America/Guayaquil',

        method: this.method(),

        status: this.status(),

        search: this.search(),

        page: this.page(),

        per_page: this.perPage(),
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),

        finalize(() => {
          this.loading.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.transactions.set(response.data.transactions);

          this.summary.set(response.data.summary);

          this.total.set(response.meta.total);

          this.page.set(response.meta.current_page);

          this.perPage.set(response.meta.per_page);
        },

        error: (error) => {
          const payload = error.error as AdminApiValidationError | undefined;

          this.messages.add({
            severity: 'error',
            summary: 'No se pudieron cargar las transacciones',
            detail: payload?.message || 'Ocurrió un error consultando la información financiera.',
          });
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.filtersDrawerVisible.set(false);
    this.load();
  }

  clearFilters(): void {
    this.dateFrom.set(this.startOfCurrentMonth());

    this.dateTo.set(new Date());

    this.method.set(null);
    this.status.set(null);
    this.search.set('');
    this.page.set(1);
    this.filtersDrawerVisible.set(false);

    this.load();
  }

  onSearchEnter(): void {
    this.applyFilters();
  }

  openFilters(): void {
    this.filtersDrawerVisible.set(true);
  }

  closeFilters(): void {
    this.filtersDrawerVisible.set(false);
  }

  showTransactionDetail(transaction: AdminPaymentTransaction): void {
    this.selectedTransaction.set(transaction);

    this.detailVisible.set(true);
  }

  closeTransactionDetail(): void {
    this.detailVisible.set(false);
    this.selectedTransaction.set(null);
  }

  onPageChange(event: PaginatorState): void {
    const rows = event.rows ?? this.perPage();

    const first = event.first ?? 0;

    this.perPage.set(rows);

    this.page.set(Math.floor(first / rows) + 1);

    this.load();
  }

  methodLabel(method: AdminPaymentMethod): string {
    switch (method) {
      case 'cash':
        return 'Efectivo';

      case 'transfer':
        return 'Transferencia';

      case 'paypal':
        return 'PayPal';
    }
  }

  methodIcon(method: AdminPaymentMethod): string {
    switch (method) {
      case 'cash':
        return 'pi pi-wallet';

      case 'transfer':
        return 'pi pi-building-columns';

      case 'paypal':
        return 'pi pi-credit-card';
    }
  }

  methodSeverity(method: AdminPaymentMethod): TagSeverity {
    switch (method) {
      case 'cash':
        return 'success';

      case 'transfer':
        return 'info';

      case 'paypal':
        return 'contrast';
    }
  }

  statusLabel(status: AdminPaymentTransactionStatus): string {
    const labels: Record<AdminPaymentTransactionStatus, string> = {
      collected: 'Cobrado',

      pending: 'Pendiente',

      approved: 'Aprobado',

      rejected: 'Rechazado',

      created: 'Creado',

      completed: 'Completado',

      denied: 'Denegado',

      failed: 'Fallido',

      cancelled: 'Cancelado',

      refunded: 'Reembolsado',

      partially_refunded: 'Reembolso parcial',
    };

    return labels[status];
  }

  statusSeverity(status: AdminPaymentTransactionStatus): TagSeverity {
    switch (status) {
      case 'collected':
      case 'approved':
      case 'completed':
        return 'success';

      case 'pending':
      case 'created':
        return 'warn';

      case 'refunded':
      case 'partially_refunded':
        return 'info';

      case 'rejected':
      case 'denied':
      case 'failed':
      case 'cancelled':
        return 'danger';
    }
  }

  statusIcon(status: AdminPaymentTransactionStatus): string {
    switch (status) {
      case 'collected':
      case 'approved':
      case 'completed':
        return 'pi pi-check-circle';

      case 'pending':
      case 'created':
        return 'pi pi-clock';

      case 'refunded':
      case 'partially_refunded':
        return 'pi pi-replay';

      case 'rejected':
      case 'denied':
      case 'failed':
      case 'cancelled':
        return 'pi pi-times-circle';
    }
  }

  isSuccessful(status: AdminPaymentTransactionStatus): boolean {
    return ['collected', 'approved', 'completed'].includes(status);
  }

  transactionSourceLabel(source: AdminPaymentTransaction['source']): string {
    switch (source) {
      case 'order':
        return 'Pedido en efectivo';

      case 'payment_receipt':
        return 'Comprobante de transferencia';

      case 'payment':
        return 'Transacción PayPal';
    }
  }

  customerContact(transaction: AdminPaymentTransaction): string {
    return transaction.customer.phone || transaction.customer.email || 'Sin contacto registrado';
  }

  private hasValidDateRange(): boolean {
    const from = this.dateFrom();

    const to = this.dateTo();

    return !from || !to || from <= to;
  }

  private startOfCurrentMonth(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  private shortDate(value: Date): string {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  private formatDate(value: Date | null): string | null {
    if (value === null) {
      return null;
    }

    const year = value.getFullYear();

    const month = String(value.getMonth() + 1).padStart(2, '0');

    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  async copyToClipboard(value: string | null, label = 'Dato'): Promise<void> {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
      this.messages.add({
        severity: 'warn',
        summary: 'No disponible',
        detail: `${label} no contiene información para copiar.`,
      });

      return;
    }

    try {
      await navigator.clipboard.writeText(normalizedValue);

      this.messages.add({
        severity: 'success',
        summary: 'Copiado',
        detail: `${label} copiado al portapapeles.`,
      });
    } catch {
      const copied = this.copyWithFallback(normalizedValue);

      this.messages.add({
        severity: copied ? 'success' : 'error',

        summary: copied ? 'Copiado' : 'No se pudo copiar',

        detail: copied
          ? `${label} copiado al portapapeles.`
          : `No fue posible copiar ${label.toLowerCase()}.`,
      });
    }
  }

  private copyWithFallback(value: string): boolean {
    const textarea = document.createElement('textarea');

    textarea.value = value;

    textarea.setAttribute('readonly', '');

    textarea.style.position = 'fixed';

    textarea.style.opacity = '0';

    textarea.style.pointerEvents = 'none';

    document.body.appendChild(textarea);

    textarea.select();

    let copied = false;

    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }

    return copied;
  }
}
