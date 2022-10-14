'use strict';

const { EventEmitter } = require('events');

class CustomAbortSignal {
  constructor() {
    this.eventEmitter = new EventEmitter();
    this.onabort = null;
    this.aborted = false;
  }
  toString() {
    return '[object CustomAbortSignal]';
  }
  get [Symbol.toStringTag]() {
    return 'CustomAbortSignal';
  }
  removeEventListener(name, handler) {
    this.eventEmitter.removeListener(name, handler);
  }
  addEventListener(name, handler) {
    this.eventEmitter.on(name, handler);
  }
  dispatchEvent(type) {
    const event = { type, target: this };
    const handlerName = `on${type}`;

    if (typeof this[handlerName] === 'function') this[handlerName](event);
  }
}

class CustomAbortController {
  constructor() {
    this.signal = new CustomAbortSignal();
  }
  abort() {
    if (this.signal.aborted) return;

    this.signal.aborted = true;
    this.signal.dispatchEvent('abort');
  }
  toString() {
    return '[object CustomAbortController]';
  }
  get [Symbol.toStringTag]() {
    return 'CustomAbortController';
  }
}

module.exports = { CustomAbortController, CustomAbortSignal };