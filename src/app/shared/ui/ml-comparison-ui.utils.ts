import {
  ForecastSizes,
  MachineLearningComparisonDay,
  MachineLearningComparisonStatus,
} from '../../core/api/machine-learning/machine-learning.models';

export interface MlSizeComparisonItem {
  key: keyof ForecastSizes;
  label: string;
  predicted: number;
  actual: number | null;
  difference: number | null;
}

export function mlComparisonStatusLabel(
  status: MachineLearningComparisonStatus,
): string {
  switch (status) {
    case 'completed':
      return 'Finalizado';
    case 'in_progress':
      return 'En curso';
    case 'pending':
      return 'Pendiente';
  }
}

export function mlComparisonStatusSeverity(
  status: MachineLearningComparisonStatus,
): 'success' | 'info' | 'warn' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warn';
  }
}

export function mlComparisonStatusIcon(
  status: MachineLearningComparisonStatus,
): string {
  switch (status) {
    case 'completed':
      return 'pi pi-check-circle';
    case 'in_progress':
      return 'pi pi-clock';
    case 'pending':
      return 'pi pi-hourglass';
  }
}

export function mlDifferenceClass(
  value: number | null,
): string {
  if (value === null || value === 0) {
    return 'metric-neutral';
  }

  return value > 0
    ? 'metric-positive'
    : 'metric-negative';
}

export function mlDifferenceLabel(
  value: number | null,
): string {
  if (value === null) {
    return 'Resultado pendiente';
  }

  if (value === 0) {
    return 'Coincidencia exacta';
  }

  if (value > 0) {
    return `${mlFormatNumber(value)} sobre lo previsto`;
  }

  return `${mlFormatNumber(Math.abs(value))} bajo lo previsto`;
}

export function mlAccuracyClass(
  accuracy: number | null,
): string {
  if (accuracy === null) {
    return 'accuracy-pending';
  }

  if (accuracy >= 90) {
    return 'accuracy-excellent';
  }

  if (accuracy >= 75) {
    return 'accuracy-good';
  }

  return 'accuracy-low';
}

export function mlAccuracyDescription(
  accuracy: number | null,
): string {
  if (accuracy === null) {
    return 'Sin resultado definitivo';
  }

  if (accuracy >= 90) {
    return 'Predicción muy precisa';
  }

  if (accuracy >= 75) {
    return 'Precisión aceptable';
  }

  return 'Requiere más datos o ajuste';
}

export function mlParseApiDate(
  value: string,
): Date {
  const [year, month, day] = value
    .substring(0, 10)
    .split('-')
    .map(Number);

  return new Date(year, month - 1, day);
}

export function mlFormatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(mlParseApiDate(value));
}

export function mlFormatShortDate(
  value: string,
): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
  }).format(mlParseApiDate(value));
}

export function mlFormatNumber(
  value: number | null | undefined,
  digits = 0,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function mlFormatSignedNumber(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  const prefix = value > 0 ? '+' : '';
  return `${prefix}${mlFormatNumber(value)}`;
}

export function mlFormatPercentage(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return `${mlFormatNumber(value, 2)} %`;
}

export function mlFormatCurrency(
  value: number | null | undefined,
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function mlSizeComparison(
  day: MachineLearningComparisonDay,
): MlSizeComparisonItem[] {
  const createItem = (
    key: keyof ForecastSizes,
    label: string,
  ): MlSizeComparisonItem => {
    const predicted = day.predicted_sizes[key];
    const actual = day.actual_sizes
      ? day.actual_sizes[key]
      : null;

    return {
      key,
      label,
      predicted,
      actual,
      difference:
        actual === null
          ? null
          : actual - predicted,
    };
  };

  return [
    createItem('mini', 'Mini'),
    createItem('small', 'Pequeña'),
    createItem('medium', 'Mediana'),
    createItem('family', 'Familiar'),
    createItem('giant', 'Gigante'),
  ];
}
