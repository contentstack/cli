const executeTask = function (tasks = [], handler, options) {
  if (typeof handler !== 'function') {
    throw new Error('Invalid handler');
  }
  const { concurrency = 1 } = options;
  const limit = promiseLimit(concurrency);
  return Promise.all(
    tasks.map((name) => {
      console.log(name);
      return limit(() => handler(name));
    }),
  );
};

module.exports = {
  executeTask,
};
