import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MessageService } from 'primeng/api';

import { CartStore } from './core/api/cart/cart.store';
import { App } from './app';
import { Toolbar } from './shared/components/toolbar/toolbar';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  template: '<header data-testid="toolbar-stub"></header>',
})
class ToolbarStubComponent {}

describe('App', () => {
  const cartStoreMock = {
    hydrate: vi.fn(),
  };

  beforeEach(async () => {
    cartStoreMock.hydrate.mockClear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        MessageService,
        {
          provide: CartStore,
          useValue: cartStoreMock,
        },
      ],
    })
      .overrideComponent(App, {
        remove: {
          imports: [Toolbar],
        },
        add: {
          imports: [ToolbarStubComponent],
        },
      })
      .compileComponents();
  });

  it('should create the app and hydrate the cart', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
    expect(cartStoreMock.hydrate).toHaveBeenCalledTimes(1);
  });

  it('should render the public application shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('[data-testid="toolbar-stub"]')).not.toBeNull();
    expect(compiled.querySelector('main.app-shell')).not.toBeNull();
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
  });
});
