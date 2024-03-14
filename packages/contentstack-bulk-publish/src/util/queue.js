const { EventEmitter } = require('events');

class Queue extends EventEmitter {
  constructor() {
    super();
    this.consumer = null;
    this.count = 0;
    this.store = [];
    this.config = {};
    this.delay = 1;
    this.requestBatchSize = 1;
    this.on('dequeue', this.check);
  }

  check() {
    if (this.store.length > 0) {
      this.Dequeue();
    }
  }

  Enqueue(obj) {
    if (!obj.retry) {
      obj = { obj, retry: 0 };
    }
    if (this.count === this.requestBatchSize) {
      return this.sleep(this.delay).then(() => {
        this.count = 1; // reset the count to 1. Because the current object will be processed too, and that counts as one request
        this.store.push(obj);
        this.check();
      });
    } else {
      this.count++;
      this.store.push(obj);
      this.check();
    }
  }

  Dequeue() {
    const deq = this.store.shift();
    this.emit('dequeue');
    if (deq) {
      this.consumer(deq, this.config, this);
    }
  }

  sleep(seconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
  }
}

module.exports = {
  getQueue: function () {
    return new Queue();
  },
};
