import {
  DeliveryLocationDto,
  DeliveryTypeCode,
  OrderDto,
} from '../../orders/checkout.models';

export interface CreatePayPalOrderRequest {
  delivery_type: DeliveryTypeCode;
  delivery_location?: DeliveryLocationDto | null;
  address?: string | null;
  notes?: string | null;
}

export interface PayPalOrderDto {
  payment_id: string;
  paypal_order_id: string;
  status: string;
  provider_status: string | null;
  amount: string;
  currency: string;
  created_at: string | null;
}

export interface CreatePayPalOrderResponse {
  data: PayPalOrderDto;
  message?: string;
}

export interface CapturePayPalOrderResponse {
  data: OrderDto;
  message?: string;
  payment?: {
    status: string;
  };
}

export type PayPalPaymentStatusCode =
  | 'created'
  | 'pending'
  | 'approved'
  | 'completed'
  | 'denied'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface PayPalRecoveredOrderDto {
  id: number;
  order_number: string;
  status: string | null;
  total: string;
  ordered_at: string | null;
}

export interface PayPalPaymentStatusDto {
  payment_id: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;

  status: PayPalPaymentStatusCode;
  provider_status: string | null;

  amount: string;
  currency: string;

  is_terminal: boolean;
  can_retry_capture: boolean;

  order?: PayPalRecoveredOrderDto;

  approved_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  cancelled_at: string | null;
  refunded_at: string | null;

  created_at: string | null;
  updated_at: string | null;
}

export interface PayPalPaymentStatusResponse {
  data: PayPalPaymentStatusDto;
  message?: string;
}

export type PayPalErrorAction =
  | 'RESTART_PAYMENT_SELECTION'
  | 'RETRY_CREATE_ORDER'
  | 'CHECK_PAYMENT_STATUS'
  | null;

export interface PayPalApiErrorDetail {
  code?: string;
  recoverable?: boolean;
  action?: PayPalErrorAction;
  reference?: string | null;
}

export interface PayPalApiErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  error?: PayPalApiErrorDetail;
}

export interface PayPalButtonsCreateOrderData {
  paymentSource?: string;
}

export interface PayPalButtonsCreateOrderActions {
  order: {
    create(payload: unknown): Promise<string>;
  };
}

export interface PayPalButtonsOnApproveData {
  orderID: string;
  payerID?: string;
  paymentID?: string;
}

export interface PayPalButtonsOnApproveActions {
  restart(): Promise<void>;

  order?: {
    capture(): Promise<unknown>;
  };
}

export interface PayPalButtonsOnCancelData {
  orderID?: string;
}

export interface PayPalButtonsStyle {
  layout?: 'vertical' | 'horizontal';
  color?:
    | 'gold'
    | 'blue'
    | 'silver'
    | 'white'
    | 'black';
  shape?: 'rect' | 'pill';
  label?:
    | 'paypal'
    | 'checkout'
    | 'buynow'
    | 'pay'
    | 'installment';
  height?: number;
  tagline?: boolean;
}

export interface PayPalButtonsOptions {
  style?: PayPalButtonsStyle;

  createOrder(
    data: PayPalButtonsCreateOrderData,
    actions: PayPalButtonsCreateOrderActions,
  ): Promise<string>;

  onApprove(
    data: PayPalButtonsOnApproveData,
    actions: PayPalButtonsOnApproveActions,
  ): Promise<void>;

  onCancel?(
    data: PayPalButtonsOnCancelData,
  ): void;

  onError?(
    error: unknown,
  ): void;
}

export interface PayPalButtonsInstance {
  render(
    container: HTMLElement | string,
  ): Promise<void>;

  close?(): Promise<void>;

  isEligible?(): boolean;
}

export interface PayPalNamespace {
  Buttons(
    options: PayPalButtonsOptions,
  ): PayPalButtonsInstance;
}

declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}
