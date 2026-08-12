import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-operator-payment-receipt-dialogs',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogModule, ButtonModule, MessageModule, TextareaModule],
  templateUrl: './operator-payment-receipt-dialogs.html',
  styleUrl: './operator-payment-receipt-dialogs.scss',
})
export class OperatorPaymentReceiptDialogs implements OnChanges {
  @Input({ required: true }) previewVisible = false;
  @Input() previewUrl: string | null = null;
  @Input() previewMime: string | null = null;

  @Input({ required: true }) rejectionVisible = false;
  @Input({ required: true }) reviewing = false;
  @Input() rejectionError: string | null = null;

  @Output() previewClosed = new EventEmitter<void>();
  @Output() rejectionClosed = new EventEmitter<void>();
  @Output() rejectionConfirmed = new EventEmitter<string>();

  rejectionReason = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rejectionVisible']?.currentValue === true) {
      this.rejectionReason = '';
    }
  }

  get previewIsPdf(): boolean {
    return this.previewMime === 'application/pdf';
  }

  get previewIsImage(): boolean {
    return this.previewMime?.startsWith('image/') === true;
  }

  closeRejection(): void {
    if (this.reviewing) {
      return;
    }

    this.rejectionReason = '';
    this.rejectionClosed.emit();
  }

  confirmRejection(): void {
    const reason = this.rejectionReason.trim();

    if (this.reviewing || reason.length < 5 || reason.length > 500) {
      return;
    }

    this.rejectionConfirmed.emit(reason);
  }
}
