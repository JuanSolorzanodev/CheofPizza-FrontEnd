export function prettyOperatorStatus(status: string | null | undefined): string {
  const map: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    preparing: 'Preparando',
    ready: 'Listo',
    on_the_way: 'En camino',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };

  return map[status ?? ''] ?? (status || '—');
}

export function prettyDeliveryType(type: string | null | undefined): string {
  const map: Record<string, string> = {
    delivery: 'Delivery',
    pickup: 'Retiro en local',
  };

  return map[type ?? ''] ?? (type || '—');
}

export function prettyPaymentMethod(method: string | null | undefined): string {
  const map: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
  };

  return map[method ?? ''] ?? (method || '—');
}

export function formatOperatorDate(
  value: string | null | undefined,
  locale = 'es-EC',
  timeZone = 'America/Guayaquil'
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(date);
}

export type OperatorTagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

export function operatorStatusSeverity(status: string | null | undefined): OperatorTagSeverity {
  switch (status) {
    case 'pending':
    case 'preparing':
      return 'warn';
    case 'confirmed':
    case 'on_the_way':
      return 'info';
    case 'ready':
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
}

export function operatorStatusIcon(status: string | null | undefined): string {
  const icons: Record<string, string> = {
    pending: 'pi pi-bell',
    confirmed: 'pi pi-check',
    preparing: 'pi pi-hourglass',
    ready: 'pi pi-check-circle',
    on_the_way: 'pi pi-truck',
    delivered: 'pi pi-verified',
    cancelled: 'pi pi-times-circle',
  };
  return icons[status ?? ''] ?? 'pi pi-circle';
}

export function operatorStatusOperationalLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    pending: 'Nueva orden',
    confirmed: 'Confirmada',
    preparing: 'En cocina',
    ready: 'Lista para salir',
    on_the_way: 'En reparto',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  };
  return labels[status ?? ''] ?? prettyOperatorStatus(status);
}

export function operatorCustomerName(order: { customer?: { name?: string | null } | null }): string {
  return order.customer?.name?.trim() || 'Cliente no identificado';
}

export function operatorCustomerPhone(order: { customer?: { phone?: string | null } | null }): string {
  return order.customer?.phone?.trim() || 'Sin teléfono';
}

export function isOperatorTransfer(order: { payment_method?: string | null }): boolean {
  return order.payment_method === 'transfer';
}

export function isOperatorDelivery(order: { delivery_type?: string | null }): boolean {
  return order.delivery_type === 'delivery';
}

export function isOperatorHistoricalOrder(order: { status?: string | null }): boolean {
  return order.status === 'delivered' || order.status === 'cancelled';
}

export function operatorDeliveryIcon(order: { delivery_type?: string | null }): string {
  return isOperatorDelivery(order) ? 'pi pi-truck' : 'pi pi-shop';
}

export function operatorPaymentIcon(order: { payment_method?: string | null }): string {
  switch (order.payment_method) {
    case 'transfer': return 'pi pi-building-columns';
    case 'cash': return 'pi pi-money-bill';
    case 'paypal': return 'pi pi-wallet';
    default: return 'pi pi-credit-card';
  }
}

export function operatorOrderClass(order: { status: string }, baseClass: string): string {
  return [
    baseClass,
    `${baseClass}--${order.status}`,
    isOperatorHistoricalOrder(order) ? `${baseClass}--historical` : '',
  ].filter(Boolean).join(' ');
}
