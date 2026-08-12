import {
  CashMovementType,
  CashSessionStatus,
} from '../../core/api/admin/cash-register/admin-cash-register.models';

export type CashTagSeverity =
  | 'success'
  | 'secondary'
  | 'info'
  | 'warn'
  | 'danger'
  | 'contrast'
  | null
  | undefined;

export function cashSessionStatusLabel(
  status: CashSessionStatus,
  compact = false,
): string {
  if (compact) {
    return status === 'open' ? 'Abierta' : 'Cerrada';
  }

  return status === 'open' ? 'Caja abierta' : 'Caja cerrada';
}

export function cashSessionStatusSeverity(
  status: CashSessionStatus,
): CashTagSeverity {
  return status === 'open' ? 'success' : 'secondary';
}

export function cashMovementLabel(type: CashMovementType): string {
  return type === 'income' ? 'Ingreso' : 'Egreso';
}

export function cashMovementSeverity(
  type: CashMovementType,
): CashTagSeverity {
  return type === 'income' ? 'success' : 'danger';
}

export function cashMovementSign(type: CashMovementType): string {
  return type === 'income' ? '+' : '-';
}

export function cashDifferenceClass(
  difference: number | null,
  prefix: 'cash-detail' | 'cash-history',
): string {
  if (difference === null || difference === 0) {
    return `${prefix}-difference--neutral`;
  }

  return difference > 0
    ? `${prefix}-difference--positive`
    : `${prefix}-difference--negative`;
}

export function cashDifferenceLabel(difference: number | null): string {
  if (difference === null) {
    return 'Sin arqueo';
  }

  if (difference === 0) {
    return 'Caja exacta';
  }

  return difference > 0 ? 'Sobrante' : 'Faltante';
}
