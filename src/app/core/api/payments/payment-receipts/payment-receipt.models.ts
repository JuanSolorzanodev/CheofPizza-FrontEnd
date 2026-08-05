export type PaymentReceiptStatus =
  | 'pending'
  | 'approved'
  | 'rejected';

export interface PaymentReceiptCustomerSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
}

export interface PaymentReceiptOrderSummary {
  id: number;
  order_number: string;
  total: number;
  ordered_at: string | null;
  payment_method: string | null;
  customer: PaymentReceiptCustomerSummary | null;
}

export interface PaymentReceiptReviewerSummary {
  id: number;
  name: string;
}

export interface PaymentReceiptDto {
  id: number;
  uuid: string;
  order_id: number;

  order?: PaymentReceiptOrderSummary | null;

  status: PaymentReceiptStatus;

  original_name: string;
  mime_type: string;
  file_size: number;

  file_available: boolean;
  file_url: string | null;

  rejection_reason: string | null;

  submitted_at: string | null;
  reviewed_at: string | null;
  expires_at: string | null;
  file_deleted_at: string | null;

  reviewed_by?: PaymentReceiptReviewerSummary | null;

  created_at: string | null;
  updated_at: string | null;
}

/**
 * Respuesta de un JsonResource individual de Laravel.
 */
export interface PaymentReceiptResourceResponse {
  data: PaymentReceiptDto;
}

/**
 * Respuesta paginada de la bandeja operativa.
 */
export interface PaymentReceiptPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaymentReceiptPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PaymentReceiptPaginatedResponse {
  data: PaymentReceiptDto[];
  meta: PaymentReceiptPaginationMeta;
  links: PaymentReceiptPaginationLinks;
}

/**
 * Algunas respuestas personalizadas del frontend anterior todavía pueden
 * utilizar esta envoltura.
 */
export interface PaymentReceiptResponse {
  success?: boolean;
  message?: string;
  data: PaymentReceiptDto;
}

export interface PaymentReceiptCollectionResponse {
  success?: boolean;
  message?: string;
  data: PaymentReceiptDto[];
}

export interface PaymentReceiptValidationErrorResponse {
  message?: string;

  errors?: Record<string, string[]>;
}

export const PAYMENT_RECEIPT_ALLOWED_TYPES = new Set<string>([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const PAYMENT_RECEIPT_MAX_SIZE = 5 * 1024 * 1024;

export function paymentReceiptStatusLabel(
  status: PaymentReceiptStatus | string | null | undefined,
): string {
  switch ((status ?? '').trim().toLowerCase()) {
    case 'pending':
      return 'Pendiente de revisión';

    case 'approved':
      return 'Comprobante aprobado';

    case 'rejected':
      return 'Comprobante rechazado';

    default:
      return 'Sin comprobante';
  }
}

export function paymentReceiptFileSize(
  bytes: number | null | undefined,
): string {
  const size = Number(bytes ?? 0);

  if (!Number.isFinite(size) || size <= 0) {
    return '0 KB';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
