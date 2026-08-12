import {
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  firstValueFrom,
  of,
  throwError,
} from 'rxjs';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppLoggerService } from '../../logging/app-logger.service';

import { CartApiService } from './cart-api.service';
import {
  ApiResponse,
  CartAddPizzaRequestDto,
  CartDto,
} from './cart.models';
import { CartSessionService } from './cart-session.service';
import { CartStore } from './cart.store';

interface CartApiMock {
  getCart: ReturnType<typeof vi.fn>;
  addPizza: ReturnType<typeof vi.fn>;
  addPromotion: ReturnType<typeof vi.fn>;
  updateQuantity: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

interface CartSessionMock {
  set: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
}

function createCart(
  overrides: Partial<CartDto> = {},
): CartDto {
  return {
    id: 1,
    session_id: 'body-session',
    user_id: null,
    status: 'active',
    total_units: 2,
    total: 24.5,
    items: [],
    ...overrides,
  };
}

function responseFor(
  cart: CartDto,
  headerSession?: string,
): HttpResponse<ApiResponse<CartDto>> {
  return new HttpResponse({
    body: {
      data: cart,
    },
    headers: headerSession
      ? new HttpHeaders({
          'X-Cart-Session': headerSession,
        })
      : undefined,
    status: 200,
  });
}

describe('CartStore', () => {
  let store: CartStore;
  let api: CartApiMock;
  let session: CartSessionMock;
  let logger: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      getCart: vi.fn(),
      addPizza: vi.fn(),
      addPromotion: vi.fn(),
      updateQuantity: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };

    session = {
      set: vi.fn(),
      clear: vi.fn(),
    };

    logger = {
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CartStore,
        {
          provide: CartApiService,
          useValue: api,
        },
        {
          provide: CartSessionService,
          useValue: session,
        },
        {
          provide: AppLoggerService,
          useValue: logger,
        },
      ],
    });

    store = TestBed.inject(CartStore);
  });

  it('starts with an empty cart state', () => {
    expect(store.cart()).toBeNull();
    expect(store.items()).toEqual([]);
    expect(store.totalUnits()).toBe(0);
    expect(store.total()).toBe(0);
    expect(store.isEmpty()).toBe(true);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('hydrates the cart and prioritizes the session header', () => {
    const cart = createCart({
      total_units: 3,
      total: 41.75,
    });

    api.getCart.mockReturnValue(
      of(responseFor(cart, 'header-session')),
    );

    store.hydrate();

    expect(api.getCart).toHaveBeenCalledTimes(1);
    expect(store.cart()).toEqual(cart);
    expect(store.totalUnits()).toBe(3);
    expect(store.total()).toBe(41.75);
    expect(store.loading()).toBe(false);
    expect(session.set).toHaveBeenCalledWith(
      'header-session',
    );
  });

  it('falls back to the cart body session when the header is absent', () => {
    const cart = createCart({
      session_id: 'cart-body-session',
    });

    api.getCart.mockReturnValue(
      of(responseFor(cart)),
    );

    store.hydrate();

    expect(session.set).toHaveBeenCalledWith(
      'cart-body-session',
    );
  });

  it('normalizes pizza quantity to the supported range before sending it', () => {
    const cart = createCart();

    api.updateQuantity.mockReturnValue(
      of(responseFor(cart)),
    );

    store.setQuantity(18, 99.8);

    expect(api.updateQuantity).toHaveBeenCalledWith(
      18,
      10,
    );

    api.updateQuantity.mockClear();

    store.setQuantity(18, -7);

    expect(api.updateQuantity).toHaveBeenCalledWith(
      18,
      1,
    );
  });

  it('ignores a non-finite quantity', () => {
    store.setQuantity(18, Number.NaN);

    expect(api.updateQuantity).not.toHaveBeenCalled();
    expect(store.loading()).toBe(false);
  });

  it('rehydrates after a failed quantity update to recover the remote state', () => {
    const remoteCart = createCart({
      total_units: 4,
      total: 53,
    });

    api.updateQuantity.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'Cantidad desactualizada.',
            },
          }),
      ),
    );

    api.getCart.mockReturnValue(
      of(responseFor(remoteCart)),
    );

    store.setQuantity(9, 4);

    expect(api.updateQuantity).toHaveBeenCalledWith(
      9,
      4,
    );
    expect(api.getCart).toHaveBeenCalledTimes(1);
    expect(store.cart()).toEqual(remoteCart);
    expect(store.loading()).toBe(false);
  });

  it('returns the updated cart when adding a pizza', async () => {
    const cart = createCart({
      total_units: 1,
      total: 12.25,
    });

    const payload = {
      pizza_id: 10,
      size_id: 3,
      quantity: 1,
      is_half_and_half: false,
      customizations: [],
    } as CartAddPizzaRequestDto;

    api.addPizza.mockReturnValue(
      of(responseFor(cart)),
    );

    const result = await firstValueFrom(
      store.addPizza(payload),
    );

    expect(api.addPizza).toHaveBeenCalledWith(
      payload,
    );
    expect(result).toEqual(cart);
    expect(store.cart()).toEqual(cart);
    expect(store.loading()).toBe(false);
  });

  it('exposes the backend error and rethrows when adding a pizza fails', async () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: {
        message: 'La pizza ya no está disponible.',
      },
    });

    api.addPizza.mockReturnValue(
      throwError(() => error),
    );

    const payload = {
      pizza_id: 99,
      size_id: 2,
      quantity: 1,
      is_half_and_half: false,
      customizations: [],
    } as CartAddPizzaRequestDto;

    await expect(
      firstValueFrom(
        store.addPizza(payload),
      ),
    ).rejects.toBe(error);

    expect(store.error()).toBe(
      'La pizza ya no está disponible.',
    );
    expect(store.loading()).toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('does not call clear when the cart is already empty', () => {
    store.clear();

    expect(api.clear).not.toHaveBeenCalled();
  });

  it('discards the local cart session and reactive state', () => {
    store.replaceCart(
      createCart({
        total_units: 5,
      }),
    );

    store.discardLocalSession();

    expect(store.cart()).toBeNull();
    expect(store.error()).toBeNull();
    expect(store.loading()).toBe(false);
    expect(session.clear).toHaveBeenCalledTimes(1);
  });
});
