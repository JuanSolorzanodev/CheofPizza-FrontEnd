import {
  OperatorOrderDetailDto,
  OperatorOrderListDto,
  OrderStatusName,
} from '../api/operator/operator-orders.models';

import {
  OrderDto,
} from '../api/orders/checkout.models';

export interface OperatorOrderCreatedRealtimeEvent {
  order_id: number;
  summary: OperatorOrderListDto;
  detail: OperatorOrderDetailDto;
}

export interface OperatorOrderStatusChangedRealtimeEvent {
  order_id?: number;

  from_status: OrderStatusName | string;
  to_status: OrderStatusName | string;

  summary?: OperatorOrderListDto;

  /**
   * Contrato normalizado para la UI.
   *
   * El backend/realtime puede enviar detail, order o data,
   * pero desde core hacia las páginas siempre exponemos
   * únicamente detail.
   */
  detail?: OperatorOrderDetailDto;
}

export interface CustomerOrderUpdatedRealtimeEvent {
  action?: string;
  order_id?: number;
  order: OrderDto;
}

export type OperatorOrderRealtimeEvent =
  | OperatorOrderCreatedRealtimeEvent
  | OperatorOrderStatusChangedRealtimeEvent;
