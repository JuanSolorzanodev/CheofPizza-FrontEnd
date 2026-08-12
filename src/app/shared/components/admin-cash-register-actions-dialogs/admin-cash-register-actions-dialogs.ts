import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import {
  CashMovementType,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  StoreCashMovementPayload,
} from '../../../core/api/admin/cash-register/admin-cash-register.models';

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
  selector: 'app-admin-cash-register-actions-dialogs',
  standalone: true,
  imports: [
    CurrencyPipe,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputNumberModule,
    MessageModule,
    SelectModule,
    TextareaModule,
  ],
  templateUrl: './admin-cash-register-actions-dialogs.html',
  styleUrl: './admin-cash-register-actions-dialogs.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCashRegisterActionsDialogsComponent {
  private readonly formBuilder = inject(FormBuilder);

  readonly openVisible = input(false);
  readonly movementVisible = input(false);
  readonly closeVisible = input(false);
  readonly initialMovementType = input<CashMovementType>('income');
  readonly expectedCash = input(0);
  readonly loading = input(false);
  readonly serverErrors = input<Record<string, string[]>>({});

  readonly openVisibleChange = output<boolean>();
  readonly movementVisibleChange = output<boolean>();
  readonly closeVisibleChange = output<boolean>();
  readonly openSubmit = output<OpenCashSessionPayload>();
  readonly movementSubmit = output<StoreCashMovementPayload>();
  readonly closeSubmit = output<CloseCashSessionPayload>();

  readonly submitted = signal(false);

  readonly movementTypes = [
    { label: 'Ingreso', value: 'income' as const, icon: 'pi pi-arrow-down-left' },
    { label: 'Egreso', value: 'expense' as const, icon: 'pi pi-arrow-up-right' },
  ];

  readonly openForm: OpenForm = this.formBuilder.nonNullable.group({
    opening_amount: [0, [Validators.required, Validators.min(0)]],
    opening_note: ['', [Validators.maxLength(255)]],
  });

  readonly movementForm: MovementForm = this.formBuilder.nonNullable.group({
    type: ['income' as CashMovementType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    reason: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
  });

  readonly closeForm: CloseForm = this.formBuilder.nonNullable.group({
    counted_cash: [0, [Validators.required, Validators.min(0)]],
    closing_note: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    effect(() => {
      if (this.openVisible()) {
        this.submitted.set(false);
        this.openForm.reset({ opening_amount: 0, opening_note: '' });
      }
    });

    effect(() => {
      if (this.movementVisible()) {
        this.submitted.set(false);
        this.movementForm.reset({
          type: this.initialMovementType(),
          amount: 0,
          reason: '',
        });
      }
    });

    effect(() => {
      if (this.closeVisible()) {
        this.submitted.set(false);
        this.closeForm.reset({
          counted_cash: this.expectedCash(),
          closing_note: '',
        });
      }
    });
  }

  onOpenVisibleChange(visible: boolean): void {
    if (!visible && this.loading()) return;
    this.openVisibleChange.emit(visible);
  }

  onMovementVisibleChange(visible: boolean): void {
    if (!visible && this.loading()) return;
    this.movementVisibleChange.emit(visible);
  }

  onCloseVisibleChange(visible: boolean): void {
    if (!visible && this.loading()) return;
    this.closeVisibleChange.emit(visible);
  }

  submitOpen(): void {
    this.submitted.set(true);
    this.openForm.markAllAsTouched();
    if (this.openForm.invalid || this.loading()) return;

    const value = this.openForm.getRawValue();
    this.openSubmit.emit({
      opening_amount: value.opening_amount,
      opening_note: this.nullableText(value.opening_note),
    });
  }

  submitMovement(): void {
    this.submitted.set(true);
    this.movementForm.markAllAsTouched();
    if (this.movementForm.invalid || this.loading()) return;

    const value = this.movementForm.getRawValue();
    this.movementSubmit.emit({
      type: value.type,
      amount: value.amount,
      reason: value.reason.trim(),
    });
  }

  submitClose(): void {
    this.submitted.set(true);
    this.closeForm.markAllAsTouched();
    if (this.closeForm.invalid || this.loading()) return;

    const value = this.closeForm.getRawValue();
    this.closeSubmit.emit({
      counted_cash: value.counted_cash,
      closing_note: this.nullableText(value.closing_note),
    });
  }

  fieldInvalid(control: FormControl<unknown>): boolean {
    return control.invalid && (control.touched || this.submitted());
  }

  private nullableText(value: string): string | null {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
