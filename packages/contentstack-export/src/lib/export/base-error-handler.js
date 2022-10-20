const _ = require('lodash')

module.exports = class BaseErrorHandler {
  processInterrupt = false
  internalErrorCaptured = false
  hooks = ['exit', 'beforeExit']
  interrupt = ['SIGINT', 'SIGQUIT', 'SIGTERM']
  exceptions = ['unhandledRejection', 'uncaughtException']

  get isInternalErrorOccurred() {
    return this.internalErrorCaptured
  }

  get isProcessInterrupt() {
    return this.processInterrupt
  }

  registerHooks(instance = this, hooks = this.hooks) {
    const self = this
    _.forEach(hooks, hook => {
      process.on(hook, (code) => instance[hook](code, self))
    })
  }

  // NOTE placeholder method
  beforeExit() {
    return void 0
  }

  // NOTE placeholder method
  exit() {
    return void 0
  }

  registerOnInterruptEvents(interrupt, callBack, _child) {
    const self = this
    _.forEach(
      (interrupt || this.interrupt),
      (event) => {
        process.on(event, () => {
          self.processInterrupt = true
          callBack(_child)
        })
      }
    )
  }

  registerExceptionEvents(exceptions, callBack, _child) {
    const self = this
    _.forEach(
      (exceptions || this.exceptions),
      (event) => {
        process.on(event, (reason, promise) => {
          self.internalErrorCaptured = true
          callBack(reason, promise, _child)
        })
      }
    )
  }
}