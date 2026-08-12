import {
  CommonModule,
  CurrencyPipe,
} from '@angular/common';

import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  effect,
  inject,
} from '@angular/core';

import {
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  RouterModule,
} from '@angular/router';

import {
  ButtonModule,
} from 'primeng/button';

import {
  InputNumberModule,
} from 'primeng/inputnumber';

import {
  SkeletonModule,
} from 'primeng/skeleton';

import {
  TagModule,
} from 'primeng/tag';

import {
  TextareaModule,
} from 'primeng/textarea';

import {
  CartItemDto,
} from '../../../core/api/cart/cart.models';

import {
  DeliveryTypeCode,
  PaymentMethodCode,
} from '../../../core/api/orders/checkout.models';

import {
  GoogleLoginDialogComponent,
} from '../../../shared/components/google-login-dialog/google-login-dialog';

import {
  LocationPicker,
} from '../../../shared/components/location-picker/location-picker';

import {
  PayPalButtonComponent,
} from '../../../shared/components/paypal-button/paypal-button';

import {
  CheckoutPageFacade,
  CheckoutStepId,
} from './checkout-page.facade';

@Component({
  standalone:
    true,

  selector:
    'app-checkout-page',

  imports: [
    CommonModule,
    RouterModule,
    CurrencyPipe,

    ReactiveFormsModule,
    FormsModule,

    ButtonModule,
    InputNumberModule,
    SkeletonModule,
    TagModule,
    TextareaModule,

    GoogleLoginDialogComponent,
    LocationPicker,
    PayPalButtonComponent,
  ],

  providers: [
    CheckoutPageFacade,
  ],

  templateUrl:
    './checkout-page.html',

  styleUrl:
    './checkout-page.scss',

  changeDetection:
    ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage {
  private readonly facade =
    inject(
      CheckoutPageFacade,
    );

  @ViewChild(
    GoogleLoginDialogComponent,
  )
  private loginDialog?:
    GoogleLoginDialogComponent;

  readonly cart =
    this.facade.cart;

  readonly auth =
    this.facade.auth;

  readonly activeStep =
    this.facade.activeStep;

  readonly placing =
    this.facade.placing;

  readonly configLoading =
    this.facade.configLoading;

  readonly checkoutConfig =
    this.facade.checkoutConfig;

  readonly showManualAddress =
    this.facade.showManualAddress;

  readonly form =
    this.facade.form;

  readonly deliveryType =
    this.facade.deliveryType;

  readonly paymentMethod =
    this.facade.paymentMethod;

  readonly addressText =
    this.facade.addressText;

  readonly deliveryLocation =
    this.facade.deliveryLocation;

  readonly hasItems =
    this.facade.hasItems;

  readonly isDelivery =
    this.facade.isDelivery;

  readonly isTransfer =
    this.facade.isTransfer;

  readonly isCard =
    this.facade.isCard;

  readonly store =
    this.facade.store;

  readonly delivery =
    this.facade.delivery;

  readonly payments =
    this.facade.payments;

  readonly transferConfig =
    this.facade.transferConfig;

  readonly paypalConfig =
    this.facade.paypalConfig;

  readonly storeAcceptsOrders =
    this.facade.storeAcceptsOrders;

  readonly pickupEnabled =
    this.facade.pickupEnabled;

  readonly deliveryEnabled =
    this.facade.deliveryEnabled;

  readonly cashEnabled =
    this.facade.cashEnabled;

  readonly transferEnabled =
    this.facade.transferEnabled;

  readonly paypalEnabled =
    this.facade.paypalEnabled;

  readonly subtotal =
    this.facade.subtotal;

  readonly deliveryFee =
    this.facade.deliveryFee;

  readonly total =
    this.facade.total;

  readonly minimumOrder =
    this.facade.minimumOrder;

  readonly meetsMinimumOrder =
    this.facade.meetsMinimumOrder;

  readonly isOptionalAddressOk =
    this.facade.isOptionalAddressOk;

  readonly isLocationOk =
    this.facade.isLocationOk;

  readonly deliveryStepValid =
    this.facade.deliveryStepValid;

  readonly reviewStepValid =
    this.facade.reviewStepValid;

  readonly paymentStepValid =
    this.facade.paymentStepValid;

  readonly canProceed =
    this.facade.canProceed;

  readonly steps =
    this.facade.steps;

  readonly selectedDeliveryLabel =
    this.facade.selectedDeliveryLabel;

  readonly selectedPaymentLabel =
    this.facade.selectedPaymentLabel;

  readonly paypalCartFingerprint =
    this.facade.paypalCartFingerprint;

  readonly paypalPayload =
    this.facade.paypalPayload;

  readonly handlePayPalCompleted =
    this.facade.handlePayPalCompleted;

  constructor() {
    effect(() => {
      const requestVersion =
        this.facade
          .loginRequestVersion();

      if (
        requestVersion <=
        0
      ) {
        return;
      }

      queueMicrotask(
        () => {
          this.loginDialog
            ?.open();
        },
      );
    });
  }

  openLogin(): void {
    this.facade
      .requestLogin();
  }

  selectDelivery(
    type:
      DeliveryTypeCode,
  ): void {
    this.facade
      .selectDelivery(
        type,
      );
  }

  selectPayment(
    method:
      PaymentMethodCode,
  ): void {
    this.facade
      .selectPayment(
        method,
      );
  }

  goTo(
    step:
      CheckoutStepId,
  ): void {
    this.facade
      .goTo(
        step,
      );
  }

  prev(): void {
    this.facade
      .prev();
  }

  next(): void {
    this.facade
      .next();
  }

  toggleManualAddress(): void {
    this.facade
      .toggleManualAddress();
  }

  continueShopping(): void {
    this.facade
      .continueShopping();
  }

  itemTitle(
    item:
      CartItemDto,
  ): string {
    return this.facade
      .itemTitle(
        item,
      );
  }

  itemImage(
    item:
      CartItemDto,
  ): string {
    return this.facade
      .itemImage(
        item,
      );
  }

  confirm(): void {
    this.facade
      .confirm();
  }
}
