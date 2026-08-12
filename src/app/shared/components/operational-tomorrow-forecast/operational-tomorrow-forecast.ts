import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import {
  ButtonModule,
} from 'primeng/button';
import {
  TagModule,
} from 'primeng/tag';

import {
  ForecastOperationalDay,
  MachineLearningRun,
} from '../../../core/api/machine-learning/machine-learning.models';

@Component({
  selector: 'app-operational-tomorrow-forecast',
  standalone: true,
  imports: [
    ButtonModule,
    TagModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './operational-tomorrow-forecast.html',
  styleUrl: './operational-tomorrow-forecast.scss',
})
export class OperationalTomorrowForecastComponent {
  readonly run = input.required<MachineLearningRun>();

  readonly generateRequested = output<void>();

  readonly operationalForecastAvailable = computed(
    () =>
      this.run().operational?.available === true,
  );

  readonly tomorrowOperational =
    computed<ForecastOperationalDay | null>(
      () => {
        const operational =
          this.run().operational;

        if (
          !operational?.available ||
          operational.days.length === 0
        ) {
          return null;
        }

        const tomorrow =
          this.toApiDate(
            this.tomorrow(),
          );

        return (
          operational.days.find(
            day => day.date === tomorrow,
          ) ?? null
        );
      },
    );

  readonly topTomorrowFlavors = computed(
    () => {
      const day =
        this.tomorrowOperational();

      if (!day) {
        return [];
      }

      return [...day.flavors]
        .sort(
          (a, b) =>
            b.expected_units -
            a.expected_units,
        )
        .slice(0, 5);
    },
  );

  readonly peakTomorrowHours = computed(
    () => {
      const day =
        this.tomorrowOperational();

      if (!day) {
        return [];
      }

      return [...day.hours]
        .sort(
          (a, b) =>
            b.expected_units -
            a.expected_units,
        )
        .slice(0, 3);
    },
  );

  readonly topTomorrowIngredients = computed(
    () => {
      const day =
        this.tomorrowOperational();

      if (!day) {
        return [];
      }

      return [...day.ingredients]
        .sort(
          (a, b) =>
            b.expected_units -
            a.expected_units,
        )
        .slice(0, 6);
    },
  );

  readonly operationalIngredientUnitLabel =
    computed(() => {
      const measurement =
        this.run().operational
          ?.ingredient_measurement;

      return measurement ===
        'recipe_equivalent_units'
        ? 'unidades equivalentes de receta'
        : measurement ||
            'unidades operativas';
    });

  readonly tomorrowOperationalInsight =
    computed(() => {
      const day =
        this.tomorrowOperational();

      if (!day) {
        return null;
      }

      const flavor =
        this.topTomorrowFlavors()[0];

      const hour =
        this.peakTomorrowHours()[0];

      const ingredient =
        this.topTomorrowIngredients()[0];

      const parts: string[] = [];

      if (flavor) {
        parts.push(
          `${flavor.name} lidera la demanda por sabor con ${this.formatMetric(flavor.expected_units, 1)} unidades equivalentes.`,
        );
      }

      if (hour) {
        parts.push(
          `La mayor presión operativa se concentra alrededor de las ${this.formatHour(hour.hour)}.`,
        );
      }

      if (ingredient) {
        parts.push(
          `${ingredient.name} aparece entre los ingredientes con mayor consumo esperado.`,
        );
      }

      return parts.length > 0
        ? parts.join(' ')
        : null;
    });

  requestGeneration(): void {
    this.generateRequested.emit();
  }

  formatDate(
    value: string | null | undefined,
  ): string {
    if (!value) {
      return '—';
    }

    const [year, month, day] =
      value.split('-').map(Number);

    const date =
      new Date(
        year,
        (month ?? 1) - 1,
        day ?? 1,
      );

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(
      'es-EC',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    ).format(date);
  }

  formatHour(hour: number): string {
    const normalized =
      Math.min(
        23,
        Math.max(
          0,
          Math.trunc(hour),
        ),
      );

    return `${String(normalized).padStart(2, '0')}:00`;
  }

  formatMetric(
    value: string | number | null | undefined,
    decimals = 2,
  ): string {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return '—';
    }

    const numeric = Number(value);

    if (Number.isNaN(numeric)) {
      return String(value);
    }

    return new Intl.NumberFormat(
      'es-EC',
      {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      },
    ).format(numeric);
  }

  private tomorrow(): Date {
    const date = new Date();

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 1);

    return date;
  }

  private toApiDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');
    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
