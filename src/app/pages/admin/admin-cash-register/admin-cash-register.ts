import {
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  RouterLink,
} from '@angular/router';

import {
  ButtonModule,
} from 'primeng/button';

import {
  DialogModule,
} from 'primeng/dialog';

import {
  InputNumberModule,
} from 'primeng/inputnumber';

import {
  InputTextModule,
} from 'primeng/inputtext';

import {
  MessageModule,
} from 'primeng/message';

import {
  SelectModule,
} from 'primeng/select';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  TableModule,
} from 'primeng/table';

import {
  TagModule,
} from 'primeng/tag';

import {
  TextareaModule,
} from 'primeng/textarea';

import {
  TooltipModule,
} from 'primeng/tooltip';

import {
  CashMovementType,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

import {
  AdminCashRegisterStore,
} from '../../../core/api/admin/cash-register/admin-cash-register.store';

type OpenForm = FormGroup<{
  opening_amount: FormControl<number>;
  opening_note: FormControl<string>;
}>;

type MovementForm = FormGroup<{
  type: FormControl<CashMovementType>;
  amount: FormControl<number>;
  reason: FormControl<string>;
}>;

type CloseForm = FormGroup<{
  counted_cash: FormControl<number>;
  closing_note: FormControl<string>;
}>;

@Component({
  selector:
    'app-admin-cash-register',

  standalone:
    true,

  imports: [
    RouterLink,
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    InputTextModule,
    MessageModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],

  providers: [
    AdminCashRegisterStore,
  ],

  templateUrl:
    './admin-cash-register.html',

  styleUrl:
    './admin-cash-register.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegister {
  readonly store =
    inject(AdminCashRegisterStore);

  private readonly formBuilder =
    inject(FormBuilder);

  readonly openDialogVisible =
    signal(false);

  readonly movementDialogVisible =
    signal(false);

  readonly closeDialogVisible =
    signal(false);

  readonly submitted =
    signal(false);

  readonly movementTypes = [
    {
      label: 'Ingreso',
      value: 'income' as const,
      icon:
        'pi pi-arrow-down-left',
    },
    {
      label: 'Egreso',
      value: 'expense' as const,
      icon:
        'pi pi-arrow-up-right',
    },
  ];

  readonly openForm: OpenForm =
    this.formBuilder.nonNullable.group({
      opening_amount: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],

      opening_note: [
        '',
        [
          Validators.maxLength(255),
        ],
      ],
    });

  readonly movementForm: MovementForm =
    this.formBuilder.nonNullable.group({
      type: [
        'income' as CashMovementType,
        Validators.required,
      ],

      amount: [
        0,
        [
          Validators.required,
          Validators.min(0.01),
        ],
      ],

      reason: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(150),
        ],
      ],
    });

  readonly closeForm: CloseForm =
    this.formBuilder.nonNullable.group({
      counted_cash: [
        0,
        [
          Validators.required,
          Validators.min(0),
        ],
      ],

      closing_note: [
        '',
        [
          Validators.maxLength(255),
        ],
      ],
    });

  readonly expectedCash =
    computed(
      () =>
        this.store.summary()
          ?.amounts.expected_cash
        ?? 0,
    );

  readonly selectedMovementType =
    computed(
      () =>
        this.movementForm
          .controls
          .type
          .value,
    );

  constructor() {
    this.store.load();
  }

  refresh(): void {
    this.store.load(true);
  }

  showOpenDialog(): void {
    this.submitted.set(false);
    this.store.clearErrors();

    this.openForm.reset({
      opening_amount: 0,
      opening_note: '',
    });

    this.openDialogVisible.set(true);
  }

  showMovementDialog(
    type: CashMovementType,
  ): void {
    this.submitted.set(false);
    this.store.clearErrors();

    this.movementForm.reset({
      type,
      amount: 0,
      reason: '',
    });

    this.movementDialogVisible.set(
      true,
    );
  }

  showCloseDialog(): void {
    this.submitted.set(false);
    this.store.clearErrors();

    this.closeForm.reset({
      counted_cash:
        this.expectedCash(),

      closing_note:
        '',
    });

    this.closeDialogVisible.set(true);
  }

  submitOpen(): void {
    this.submitted.set(true);
    this.openForm.markAllAsTouched();

    if (this.openForm.invalid) {
      return;
    }

    const value =
      this.openForm.getRawValue();

    this.store.open(
      {
        opening_amount:
          value.opening_amount,

        opening_note:
          this.nullableText(
            value.opening_note,
          ),
      },
      () =>
        this.openDialogVisible.set(
          false,
        ),
    );
  }

  submitMovement(): void {
    this.submitted.set(true);

    this.movementForm
      .markAllAsTouched();

    if (this.movementForm.invalid) {
      return;
    }

    const value =
      this.movementForm
        .getRawValue();

    this.store.addMovement(
      {
        type:
          value.type,

        amount:
          value.amount,

        reason:
          value.reason.trim(),
      },
      () =>
        this.movementDialogVisible.set(
          false,
        ),
    );
  }

  submitClose(): void {
    this.submitted.set(true);

    this.closeForm
      .markAllAsTouched();

    if (this.closeForm.invalid) {
      return;
    }

    const value =
      this.closeForm.getRawValue();

    this.store.close(
      {
        counted_cash:
          value.counted_cash,

        closing_note:
          this.nullableText(
            value.closing_note,
          ),
      },
      () =>
        this.closeDialogVisible.set(
          false,
        ),
    );
  }

  fieldInvalid(
    control: FormControl<unknown>,
  ): boolean {
    return (
      control.invalid
      && (
        control.touched
        || this.submitted()
      )
    );
  }

  movementLabel(
    type: CashMovementType,
  ): string {
    return type === 'income'
      ? 'Ingreso'
      : 'Egreso';
  }

  movementSeverity(
    type: CashMovementType,
  ): 'success' | 'danger' {
    return type === 'income'
      ? 'success'
      : 'danger';
  }

  movementSign(
    type: CashMovementType,
  ): string {
    return type === 'income'
      ? '+'
      : '-';
  }

  private nullableText(
    value: string,
  ): string | null {
    const normalized =
      value.trim();

    return normalized.length > 0
      ? normalized
      : null;
  }
}
