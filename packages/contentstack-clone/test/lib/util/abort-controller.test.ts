import { expect } from 'chai';
import { CustomAbortController, CustomAbortSignal } from '../../../src/core/util/abort-controller';

describe('CustomAbortController', () => {
  describe('CustomAbortSignal', () => {
    it('should create a CustomAbortSignal with correct initial state', () => {
      const signal = new CustomAbortSignal();
      expect(signal.aborted).to.be.false;
      expect(signal.onabort).to.be.null;
      expect(signal.eventEmitter).to.exist;
    });

    it('should return correct string representation', () => {
      const signal = new CustomAbortSignal();
      expect(signal.toString()).to.equal('[object CustomAbortSignal]');
    });

    it('should return correct Symbol.toStringTag', () => {
      const signal = new CustomAbortSignal();
      expect(signal[Symbol.toStringTag]).to.equal('CustomAbortSignal');
    });

    it('should add and remove event listeners', () => {
      const signal = new CustomAbortSignal();
      let called = false;
      const handler = () => {
        called = true;
      };

      signal.addEventListener('abort', handler);
      signal.eventEmitter.emit('abort');
      expect(called).to.be.true;

      called = false;
      signal.removeEventListener('abort', handler);
      signal.eventEmitter.emit('abort');
      expect(called).to.be.false;
    });

    it('should dispatch abort event and call onabort handler', () => {
      const signal = new CustomAbortSignal();
      let called = false;
      signal.onabort = (event) => {
        called = true;
        expect(event.type).to.equal('abort');
        expect(event.target).to.equal(signal);
      };

      signal.dispatchEvent('abort');
      expect(called).to.be.true;
    });
  });

  describe('CustomAbortController', () => {
    it('should create a CustomAbortController with signal', () => {
      const controller = new CustomAbortController();
      expect(controller.signal).to.exist;
      expect(controller.signal).to.be.instanceOf(CustomAbortSignal);
      expect(controller.signal.aborted).to.be.false;
    });

    it('should return correct string representation', () => {
      const controller = new CustomAbortController();
      expect(controller.toString()).to.equal('[object CustomAbortController]');
    });

    it('should return correct Symbol.toStringTag', () => {
      const controller = new CustomAbortController();
      expect(controller[Symbol.toStringTag]).to.equal('CustomAbortController');
    });

    it('should abort the signal when abort() is called', () => {
      const controller = new CustomAbortController();
      expect(controller.signal.aborted).to.be.false;

      controller.abort();
      expect(controller.signal.aborted).to.be.true;
    });

    it('should not abort multiple times if already aborted', () => {
      const controller = new CustomAbortController();
      let eventCount = 0;

      controller.signal.addEventListener('abort', () => {
        eventCount++;
      });

      controller.abort();
      expect(controller.signal.aborted).to.be.true;
      expect(eventCount).to.equal(1);

      // Second abort should not trigger event again
      const eventCountBeforeSecondAbort = eventCount;
      controller.abort();
      expect(controller.signal.aborted).to.be.true;
      expect(eventCount).to.equal(eventCountBeforeSecondAbort); // Should not increment
    });

    it('should dispatch abort event when abort() is called', () => {
      const controller = new CustomAbortController();
      let eventReceived = false;

      controller.signal.addEventListener('abort', () => {
        eventReceived = true;
      });

      controller.abort();
      
      // Event should be dispatched synchronously
      expect(eventReceived).to.be.true;
      expect(controller.signal.aborted).to.be.true;
    });

    it('should call onabort handler when abort event is dispatched', () => {
      const controller = new CustomAbortController();
      let onabortCalled = false;

      controller.signal.onabort = () => {
        onabortCalled = true;
      };

      controller.abort();
      expect(onabortCalled).to.be.true;
    });
  });
});
