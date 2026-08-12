import {
  AdminPaymentMethod,
  AdminPaymentTransaction,
  AdminPaymentTransactionSource,
  AdminPaymentTransactionStatus,
} from '../../core/api/admin/payment-transactions/admin-payment-transactions.models';

export type AdminPaymentTransactionTagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

export function adminPaymentMethodLabel(method: AdminPaymentMethod): string {
  const labels: Record<AdminPaymentMethod, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    paypal: 'PayPal',
  };

  return labels[method];
}

export function adminPaymentMethodIcon(method: AdminPaymentMethod): string {
  const icons: Record<AdminPaymentMethod, string> = {
    cash: 'pi pi-wallet',
    transfer: 'pi pi-building-columns',
    paypal: 'pi pi-credit-card',
  };

  return icons[method];
}

export function adminPaymentStatusLabel(status: AdminPaymentTransactionStatus): string {
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

export function adminPaymentStatusSeverity(
  status: AdminPaymentTransactionStatus,
): AdminPaymentTransactionTagSeverity {
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

export function adminPaymentStatusIcon(status: AdminPaymentTransactionStatus): string {
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

export function adminPaymentTransactionSourceLabel(
  source: AdminPaymentTransactionSource,
): string {
  const labels: Record<AdminPaymentTransactionSource, string> = {
    order: 'Pedido en efectivo',
    payment_receipt: 'Comprobante de transferencia',
    payment: 'Transacción PayPal',
  };

  return labels[source];
}

export function adminPaymentCustomerContact(transaction: AdminPaymentTransaction): string {
  return transaction.customer.phone || transaction.customer.email || 'Sin contacto registrado';
}

export function adminPaymentMethodClass(method: AdminPaymentMethod): string {
  return `transaction-method transaction-method--${method}`;
}
