import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';

import { OperatorPaymentReceiptsApiService } from '../../../core/api/operator/operator-payment-receipts-api.service';
import {
  PaymentReceiptDto,
  PaymentReceiptStatus,
  paymentReceiptFileSize,
  paymentReceiptStatusLabel,
} from '../../../core/api/payments/payment-receipts/payment-receipt.models';
import { OperatorPaymentReceiptDialogs } from '../operator-payment-receipt-dialogs/operator-payment-receipt-dialogs';
import { formatOperatorDate } from '../../ui/operator-order-ui.utils';

type TagSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null | undefined;

@Component({
  selector: 'app-operator-payment-receipt-review',
  standalone: true,
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    TagModule,
    OperatorPaymentReceiptDialogs,
  ],
  templateUrl: './operator-payment-receipt-review.html',
  styleUrl: './operator-payment-receipt-review.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperatorPaymentReceiptReview {
  private readonly api = inject(OperatorPaymentReceiptsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly receipt = input<PaymentReceiptDto | null>(null);
  readonly receiptChange = output<PaymentReceiptDto>();

  readonly loading = signal(false);
  readonly reviewing = signal(false);
  readonly previewVisible = signal(false);
  readonly rejectionVisible = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly previewMime = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly canReview = computed(() => {
    const current = this.receipt();
    return current?.status === 'pending' && current.file_available === true;
  });

  openPreview(): void {
    const current = this.receipt();
    if (!current || !current.file_available || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.closeObjectUrl();

    this.api.file(current.uuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob || blob.size === 0) {
            this.error.set('El archivo del comprobante está vacío o no está disponible.');
            return;
          }

          const mimeType = blob.type || current.mime_type || 'application/octet-stream';
          this.previewUrl.set(URL.createObjectURL(blob));
          this.previewMime.set(mimeType);
          this.previewVisible.set(true);
        },
        error: (error) => {
          this.error.set(this.resolveErrorMessage(error, 'No fue posible abrir el comprobante.'));
        },
      });
  }

  closePreview(): void {
    this.previewVisible.set(false);
    this.closeObjectUrl();
  }

  approve(): void {
    const current = this.receipt();
    if (!current || current.status !== 'pending' || this.reviewing()) return;

    this.reviewing.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api.approve(current.uuid)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reviewing.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.receiptChange.emit(response.data);
          this.success.set('El comprobante fue aprobado correctamente.');
        },
        error: (error) => {
          this.error.set(this.resolveErrorMessage(error, 'No fue posible aprobar el comprobante.'));
        },
      });
  }

  openRejectDialog(): void {
    const current = this.receipt();
    if (!current || current.status !== 'pending' || this.reviewing()) return;
    this.error.set(null);
    this.success.set(null);
    this.rejectionVisible.set(true);
  }

  closeRejectDialog(): void {
    if (this.reviewing()) return;
    this.rejectionVisible.set(false);
  }

  reject(reason: string): void {
    const current = this.receipt();
    const normalizedReason = reason.trim();

    if (!current || current.status !== 'pending' || this.reviewing()) return;

    if (normalizedReason.length < 5) {
      this.error.set('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    if (normalizedReason.length > 500) {
      this.error.set('El motivo no puede superar los 500 caracteres.');
      return;
    }

    this.reviewing.set(true);
    this.error.set(null);
    this.success.set(null);

    this.api.reject(current.uuid, normalizedReason)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.reviewing.set(false)),
      )
      .subscribe({
        next: (response) => {
          this.receiptChange.emit(response.data);
          this.rejectionVisible.set(false);
          this.success.set('El comprobante fue rechazado y el motivo quedó registrado.');
        },
        error: (error) => {
          this.error.set(this.resolveErrorMessage(error, 'No fue posible rechazar el comprobante.'));
        },
      });
  }

  statusLabel(status: PaymentReceiptStatus | string | null | undefined): string {
    return paymentReceiptStatusLabel(status);
  }

  fileSize(bytes: number | null | undefined): string {
    return paymentReceiptFileSize(bytes);
  }

  statusSeverity(status: PaymentReceiptStatus | string): TagSeverity {
    switch (status) {
      case 'pending': return 'warn';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  }

  isImage(current: PaymentReceiptDto): boolean {
    return current.mime_type.startsWith('image/');
  }

  isPdf(current: PaymentReceiptDto): boolean {
    return current.mime_type === 'application/pdf';
  }

  formatDate(value: string | null | undefined): string {
    return formatOperatorDate(value);
  }

  private closeObjectUrl(): void {
    const currentUrl = this.previewUrl();
    if (currentUrl && typeof URL !== 'undefined') URL.revokeObjectURL(currentUrl);
    this.previewUrl.set(null);
    this.previewMime.set(null);
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    const response = error as {
      error?: { message?: string; errors?: Record<string, string[]> } | Blob | string;
    };

    const body = response?.error;
    if (body && typeof body === 'object' && !(body instanceof Blob)) {
      return body.errors?.['reason']?.[0] ?? body.message ?? fallback;
    }

    return fallback;
  }
}
