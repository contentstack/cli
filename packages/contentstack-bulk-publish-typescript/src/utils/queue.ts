import * as EventEmitter from 'events';

export class Queue extends EventEmitter {
  count: number;
  store: Array<any>;
  config: object;
  delay: number;
  requestBatchSize: number;
  consumer: Function;
  
  constructor() {
    super();
    this.consumer = null;
    this.count = 0;
    this.store = [];
    this.config = {};
    this.delay = 1
    this.requestBatchSize = 1
    this.on('dequeue', this.check);
  }

  check(): void {
    if (this.store.length > 0) {
      this.Dequeue();
    }
  }

  Enqueue(obj): void {
    if (!obj.retry) {
      obj = {obj, retry: 0}
    }
    if (this.count === this.requestBatchSize) {
      return this.sleep(this.delay).then(() => {
        this.count = 1 // reset the count to 1. Because the current object will be processed too, and that counts as one request
        this.store.push(obj);
        this.check();
      })
    } else {
      this.count++
      this.store.push(obj);
      this.check();
    }
  }

  Dequeue(): void {
    const deq = this.store.shift();
    this.emit('dequeue');
    if (deq) {
      this.consumer(deq, this.config, this);
    }
  }

  sleep(seconds): void {
    return new Promise(resolve => {
      setTimeout(resolve, seconds * 1000)
    })
  }
}
