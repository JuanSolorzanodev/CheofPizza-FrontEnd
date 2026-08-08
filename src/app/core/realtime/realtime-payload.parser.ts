import {
  OperatorOrderDetailDto,
  OperatorOrderListDto,
} from '../api/operator/operator-orders.models';

import {
  OrderDto,
} from '../api/orders/checkout.models';

import {
  CustomerOrderUpdatedRealtimeEvent,
  OperatorOrderCreatedRealtimeEvent,
  OperatorOrderStatusChangedRealtimeEvent,
} from './realtime.models';

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isPositiveInteger(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value > 0
  );
}

function isNonEmptyString(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0
  );
}

function isOperatorOrderList(
  value: unknown,
): value is OperatorOrderListDto {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value['id']) &&
    isNonEmptyString(
      value['order_number'],
    ) &&
    isNonEmptyString(value['status'])
  );
}

function isOperatorOrderDetail(
  value: unknown,
): value is OperatorOrderDetailDto {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value['id']) &&
    isNonEmptyString(
      value['order_number'],
    ) &&
    isNonEmptyString(value['status'])
  );
}

function isCustomerOrder(
  value: unknown,
): value is OrderDto {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isPositiveInteger(value['id']) &&
    isNonEmptyString(
      value['order_number'],
    ) &&
    isNonEmptyString(value['status'])
  );
}

export function parseOperatorOrderCreatedEvent(
  payload: unknown,
): OperatorOrderCreatedRealtimeEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const summary =
    payload['summary'];

  const detail =
    payload['detail'];

  const explicitOrderId =
    payload['order_id'];

  if (
    !isOperatorOrderList(summary) ||
    !isOperatorOrderDetail(detail)
  ) {
    return null;
  }

  const orderId =
    isPositiveInteger(explicitOrderId)
      ? explicitOrderId
      : detail.id;

  return {
    order_id: orderId,
    summary,
    detail,
  };
}

export function parseOperatorOrderStatusChangedEvent(
  payload: unknown,
): OperatorOrderStatusChangedRealtimeEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const rawFromStatus =
    payload['from_status'] ??
    payload['fromStatus'];

  const rawToStatus =
    payload['to_status'] ??
    payload['toStatus'];

  if (
    !isNonEmptyString(rawFromStatus) ||
    !isNonEmptyString(rawToStatus)
  ) {
    return null;
  }

  const event: OperatorOrderStatusChangedRealtimeEvent = {
    from_status:
      rawFromStatus.trim(),

    to_status:
      rawToStatus.trim(),
  };

  if (
    isPositiveInteger(
      payload['order_id'],
    )
  ) {
    event.order_id =
      payload['order_id'];
  }

  if (
    isOperatorOrderList(
      payload['summary'],
    )
  ) {
    event.summary =
      payload['summary'];
  }

  const detailCandidate =
    payload['detail'] ??
    payload['order'] ??
    payload['data'];

  if (
    isOperatorOrderDetail(
      detailCandidate,
    )
  ) {
    event.detail =
      detailCandidate;
  }

  return event;
}

export function parseCustomerOrderUpdatedEvent(
  payload: unknown,
): CustomerOrderUpdatedRealtimeEvent | null {
  if (!isRecord(payload)) {
    return null;
  }

  const orderCandidate =
    payload['order'] ??
    payload['data'];

  if (
    !isCustomerOrder(
      orderCandidate,
    )
  ) {
    return null;
  }

  const event: CustomerOrderUpdatedRealtimeEvent = {
    order: orderCandidate,
  };

  if (
    isNonEmptyString(
      payload['action'],
    )
  ) {
    event.action =
      payload['action'].trim();
  }

  if (
    isPositiveInteger(
      payload['order_id'],
    )
  ) {
    event.order_id =
      payload['order_id'];
  }

  return event;
}
