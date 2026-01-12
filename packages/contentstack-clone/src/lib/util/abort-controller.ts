'use strict';

import { EventEmitter } from 'events';

/**
 * Custom AbortSignal implementation
 */
class CustomAbortSignal {
  public eventEmitter: EventEmitter;
  public onabort: ((event: { type: string; target: CustomAbortSignal }) => void) | null;
  public aborted: boolean;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.onabort = null;
    this.aborted = false;
  }

  toString(): string {
    return '[object CustomAbortSignal]';
  }

  get [Symbol.toStringTag](): string {
    return 'CustomAbortSignal';
  }

  removeEventListener(name: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.removeListener(name, handler);
  }

  addEventListener(name: string, handler: (...args: any[]) => void): void {
    this.eventEmitter.on(name, handler);
  }

  dispatchEvent(type: string): void {
    const event = { type, target: this };
    const handlerName = `on${type}` as keyof this;

    // Emit event to EventEmitter listeners (for addEventListener)
    this.eventEmitter.emit(type, event);

    // Call onabort handler if it exists (for onabort property)
    if (typeof this[handlerName] === 'function') {
      (this[handlerName] as (event: { type: string; target: CustomAbortSignal }) => void)(event);
    }
  }
}

/**
 * Custom AbortController implementation
 */
class CustomAbortController {
  public signal: CustomAbortSignal;

  constructor() {
    this.signal = new CustomAbortSignal();
  }

  abort(): void {
    if (this.signal.aborted) return;

    this.signal.aborted = true;
    this.signal.dispatchEvent('abort');
  }

  toString(): string {
    return '[object CustomAbortController]';
  }

  get [Symbol.toStringTag](): string {
    return 'CustomAbortController';
  }
}

export { CustomAbortController, CustomAbortSignal };
