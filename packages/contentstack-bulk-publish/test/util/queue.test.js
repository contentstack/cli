const Queue = require('../../src/util/queue');

const queue = getQueue();


function sampleConsumerFunction(data) {
  console.log(data);
}

queue.consumer = sampleConsumerFunction;

describe('testing queue operations', () => {
  const mockedlog = () => {};
  console.log = mockedlog;
  it('enqueing operation', () => {
    expect(queue.Enqueue({ api_key: 'apiKey', access_token: 'access_token' })).toBeUndefined();
  });

  it('dequeue operations', () => {
    expect(queue.Dequeue()).toBeUndefined();
  });
});
