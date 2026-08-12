import { CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AdminPaymentTransaction } from '../../../core/api/admin/payment-transactions/admin-payment-transactions.models';
import {
  adminPaymentCustomerContact,
  adminPaymentMethodClass,
  adminPaymentMethodIcon,
  adminPaymentMethodLabel,
  adminPaymentStatusIcon,
  adminPaymentStatusLabel,
  adminPaymentStatusSeverity,
  adminPaymentTransactionSourceLabel,
} from '../../ui/admin-payment-transaction-ui.utils';

@Component({
  selector: 'app-admin-payment-transaction-detail-dialog',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    ButtonModule,
    DialogModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './admin-payment-transaction-detail-dialog.html',
  styleUrl: './admin-payment-transaction-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminPaymentTransactionDetailDialogComponent {
  private readonly messages = inject(MessageService);
  private readonly document = inject(DOCUMENT);

  readonly visible = input(false);
  readonly transaction = input<AdminPaymentTransaction | null>(null);
  readonly visibleChange = output<boolean>();

  readonly methodLabel = adminPaymentMethodLabel;
  readonly methodIcon = adminPaymentMethodIcon;
  readonly methodClass = adminPaymentMethodClass;
  readonly sourceLabel = adminPaymentTransactionSourceLabel;
  readonly statusLabel = adminPaymentStatusLabel;
  readonly statusSeverity = adminPaymentStatusSeverity;
  readonly statusIcon = adminPaymentStatusIcon;
  readonly customerContact = adminPaymentCustomerContact;

  close(): void {
    this.visibleChange.emit(false);
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
      const clipboard = this.document.defaultView?.navigator.clipboard;

      if (!clipboard) {
        throw new Error('Clipboard API unavailable');
      }

      await clipboard.writeText(normalizedValue);
      this.notifyCopy(true, label);
    } catch {
      this.notifyCopy(this.copyWithFallback(normalizedValue), label);
    }
  }

  private notifyCopy(copied: boolean, label: string): void {
    this.messages.add({
      severity: copied ? 'success' : 'error',
      summary: copied ? 'Copiado' : 'No se pudo copiar',
      detail: copied
        ? `${label} copiado al portapapeles.`
        : `No fue posible copiar ${label.toLowerCase()}.`,
    });
  }

  private copyWithFallback(value: string): boolean {
    const body = this.document.body;

    if (!body) {
      return false;
    }

    const textarea = this.document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.tabIndex = -1;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    body.appendChild(textarea);
    textarea.select();

    try {
      return this.document.execCommand('copy');
    } finally {
      textarea.remove();
    }
  }
}
