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
