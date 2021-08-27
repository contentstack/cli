'use strict'

const {map: _map, getCallsite, constants, safePromise} = require('../utils')
const Listr = require('listr')
const {waterfall} = require('async')
const {requests} = constants

// Properties
const {getMapInstance, set, get} = _map

const ContentType = require('./content-types')

// Merge all classes containing migration methods into a single class
const _Migration = _Class => class extends _Class { }

// class Migration extends _Migration(__Migration(ContentType)) { }

/**
 * Migration class
 * @class Migration
 */
class Migration extends _Migration(ContentType) {
  /**
   * Adds custom task in migration to execute.
   * @param {Object} taskDescription Task title and task function to execute
   * @param {string} taskDescription.title Title for custom task
   * @param {array} taskDescription.tasks async function to be executed
   * @param {string} taskDescription.failMessage message to be printed when task fails
   * @param {string} taskDescription.successMessage message to be printed when task succeeds
   * @example
   *
   * let first = 'binding glue'
   * let second = 'second glue'
   * let tasks = {
   *    title:'My First custom task',
   *    successMessage: 'Custom success message',
   *    failMessage: 'Custom fail message'
   *    task: async (params)=>{
   *        const {first, second} = params
   *        const a = await stackSDKInstance.fetch();
   *    },
   * }
   * migration.addTask(task)
   */
  addTask(taskDescription) {
    const {title, failMessage, successMessage} = taskDescription
    let {tasks} = taskDescription
    const callsite = getCallsite()
    const mapInstance = getMapInstance()
    if (!Array.isArray(tasks))
      tasks = [tasks]
    this.contentTypeService.base.dispatch(callsite, null, null, tasks)
    let _requests = get(requests, mapInstance)
    const req = {
      title: title,
      failedTitle: failMessage || `Failed to execute task: ${title}`,
      successTitle: successMessage || `Successfully executed task: ${title}`,
      tasks,
    }
    _requests.push(req)
    set(requests, mapInstance, _requests)
  }

  async run() {
    const mapInstance = getMapInstance()
    let _requests = get(requests, mapInstance)
    // Make calls from here
    const tasks = await this.getTasks(_requests)
    const listr = new Listr(tasks)
    await listr.run().catch(error => {
      this.handleErrors(error)
      // When the process is child, send error message to parent
      if (process.send) process.send({errorOccurred: true})
      // this.exit(0);
    })
  }

  async getTasks(requests) {
    const _tasks = []
    const results = []
    for (let i = 0; i < requests.length; i++) {
      let reqObj = requests[i]
      const {title, failedTitle, successTitle, tasks} = reqObj
      const task = {
        title: title,
        task: async (ctx, task) => {
          const [err, result] = await safePromise(waterfall(tasks))
          if (err) {
            ctx.error = true
            task.title = failedTitle
            throw err
          }
          result && results.push(result)
          task.title = successTitle
          return result
        },
      }
      _tasks.push(task)
    }
    return _tasks
  }
}

module.exports = Migration
