import { DatePipe, DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EMPTY, catchError, finalize } from 'rxjs';

import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

import { PaymentReceiptApiService } from '../../../core/api/payments/payment-receipts/payment-receipt-api.service';
import {
  PAYMENT_RECEIPT_ALLOWED_TYPES,
  PAYMENT_RECEIPT_MAX_SIZE,
  PaymentReceiptDto,
  PaymentReceiptStatus,
  PaymentReceiptValidationErrorResponse,
  paymentReceiptFileSize,
  paymentReceiptStatusLabel,
} from '../../../core/api/payments/payment-receipts/payment-receipt.models';

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
  selector: 'app-customer-payment-receipt',
  standalone: true,
  imports: [DatePipe, ButtonModule, ProgressBarModule, SkeletonModule, TagModule],
  templateUrl: './customer-payment-receipt.html',
  styleUrl: './customer-payment-receipt.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerPaymentReceiptComponent implements OnDestroy {
  private readonly receiptApi = inject(PaymentReceiptApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);
  private readonly document = inject(DOCUMENT);

  private receiptObjectUrl: string | null = null;
  private lastLoadKey = '';

  @ViewChild('receiptInput')
  private receiptInput?: ElementRef<HTMLInputElement>;

  readonly orderId = input.required<number>();
  readonly refreshVersion = input(0);

  readonly statusChange = output<PaymentReceiptStatus | null>();

  readonly loading = signal(false);
  readonly uploading = signal(false);
  readonly opening = signal(false);
  readonly selectedFile = signal<File | null>(null);
  readonly receipt = signal<PaymentReceiptDto | null>(null);
  readonly error = signal<string | null>(null);
  readonly uploadProgress = signal(0);

  readonly status = computed<PaymentReceiptStatus | null>(() => this.receipt()?.status ?? null);
  readonly statusLabel = computed(() => paymentReceiptStatusLabel(this.status()));

  readonly statusSeverity = computed<TagSeverity>(() => {
    switch (this.status()) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'pending':
        return 'warn';
      default:
        return 'secondary';
    }
  });

  readonly canUpload = computed(() => {
    if (this.uploading()) {
      return false;
    }

    const status = this.status();
    return status === null || status === 'rejected';
  });

  readonly canOpen = computed(() =>
    Boolean(this.receipt()?.file_available && this.receipt()?.uuid),
  );

  readonly fileName = computed(
    () => this.selectedFile()?.name ?? this.receipt()?.original_name ?? null,
  );

  readonly fileSize = computed(() => {
    const selected = this.selectedFile();
    return selected
      ? paymentReceiptFileSize(selected.size)
      : paymentReceiptFileSize(this.receipt()?.file_size);
  });

  readonly isPdf = computed(() => this.receipt()?.mime_type === 'application/pdf');

  constructor() {
    effect(() => {
      const orderId = this.orderId();
      const refreshVersion = this.refreshVersion();
      const loadKey = `${orderId}:${refreshVersion}`;

      if (orderId <= 0 || loadKey === this.lastLoadKey) {
        return;
      }

      this.lastLoadKey = loadKey;
      this.loadLatest(orderId);
    });
  }

  ngOnDestroy(): void {
    this.revokeReceiptUrl();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.error.set(null);

    if (!file) {
      this.selectedFile.set(null);
      return;
    }

    if (!PAYMENT_RECEIPT_ALLOWED_TYPES.has(file.type)) {
      this.rejectSelectedFile('Formato no permitido. Selecciona un archivo JPG, PNG, WebP o PDF.');
      return;
    }

    if (file.size > PAYMENT_RECEIPT_MAX_SIZE) {
      this.rejectSelectedFile('El archivo supera el límite máximo de 5 MB.');
      return;
    }

    if (file.size <= 0) {
      this.rejectSelectedFile('El archivo seleccionado está vacío.');
      return;
    }

    this.selectedFile.set(file);
  }

  removeSelectedFile(): void {
    if (this.uploading()) {
      return;
    }

    this.selectedFile.set(null);
    this.error.set(null);
    this.clearInput();
  }

  openFilePicker(): void {
    if (this.uploading() || !this.canUpload()) {
      return;
    }

    this.receiptInput?.nativeElement.click();
  }

  upload(): void {
    const orderId = this.orderId();
    const file = this.selectedFile();

    if (orderId <= 0 || !file || !this.canUpload()) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.uploadProgress.set(35);

    this.receiptApi
      .upload(orderId, file)
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          this.uploadProgress.set(0);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.setReceipt(response.data);
          this.selectedFile.set(null);
          this.clearInput();

          this.messages.add({
            severity: 'success',
            summary: 'Comprobante enviado',
            detail: response.message || 'El comprobante fue enviado para revisión.',
            life: 3500,
          });
        },
        error: (error: HttpErrorResponse) => {
          const message = this.errorMessage(error);
          this.error.set(message);

          this.messages.add({
            severity: 'error',
            summary: 'No se pudo enviar',
            detail: message,
            life: 5000,
          });
        },
      });
  }

  openReceipt(): void {
    const receipt = this.receipt();

    if (!receipt || !receipt.file_available || !receipt.uuid || this.opening()) {
      return;
    }

    this.opening.set(true);
    this.error.set(null);

    this.receiptApi
      .file(receipt.uuid)
      .pipe(
        finalize(() => this.opening.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          const blob = response.body;

          if (!blob) {
            this.error.set('El servidor no devolvió el archivo.');
            return;
          }

          const windowRef = this.document.defaultView;

          if (!windowRef) {
            this.error.set('No se puede abrir el comprobante en este entorno.');
            return;
          }

          this.revokeReceiptUrl();
          this.receiptObjectUrl = windowRef.URL.createObjectURL(blob);
          windowRef.open(this.receiptObjectUrl, '_blank', 'noopener,noreferrer');
        },
        error: (error: HttpErrorResponse) => {
          const message = this.errorMessage(error);
          this.error.set(message);

          this.messages.add({
            severity: 'error',
            summary: 'No se pudo abrir',
            detail: message,
            life: 4500,
          });
        },
      });
  }

  receiptStatusText(status: PaymentReceiptStatus | string | null | undefined): string {
    return paymentReceiptStatusLabel(status);
  }

  private loadLatest(orderId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.receiptApi
      .latest(orderId)
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.setReceipt(null);
            return EMPTY;
          }

          this.error.set(this.errorMessage(error));
          return EMPTY;
        }),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.setReceipt(response.data);
        this.selectedFile.set(null);
        this.clearInput();
      });
  }

  private setReceipt(receipt: PaymentReceiptDto | null): void {
    this.receipt.set(receipt);
    this.statusChange.emit(receipt?.status ?? null);
  }

  private rejectSelectedFile(message: string): void {
    this.selectedFile.set(null);
    this.error.set(message);
    this.clearInput();

    this.messages.add({
      severity: 'warn',
      summary: 'Archivo no válido',
      detail: message,
      life: 4200,
    });
  }

  private clearInput(): void {
    const input = this.receiptInput?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private revokeReceiptUrl(): void {
    if (!this.receiptObjectUrl) {
      return;
    }

    this.document.defaultView?.URL.revokeObjectURL(this.receiptObjectUrl);
    this.receiptObjectUrl = null;
  }

  private errorMessage(error: HttpErrorResponse): string {
    const body = error.error as PaymentReceiptValidationErrorResponse | Blob | string | null;

    if (typeof body === 'string' && body.trim()) {
      return body;
    }

    if (body && typeof body === 'object' && !(body instanceof Blob)) {
      const firstError = Object.values(body.errors ?? {})
        .flat()
        .find(Boolean);

      if (firstError) {
        return firstError;
      }

      if (body.message) {
        return body.message;
      }
    }

    switch (error.status) {
      case 401:
        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
      case 403:
        return 'No tienes permiso para acceder a este comprobante.';
      case 404:
        return 'El comprobante solicitado no está disponible.';
      case 413:
        return 'El archivo supera el tamaño permitido por el servidor.';
      case 422:
        return 'El archivo no cumple con las condiciones requeridas.';
      default:
        return error.message || 'Ocurrió un problema procesando la solicitud.';
    }
  }
}
