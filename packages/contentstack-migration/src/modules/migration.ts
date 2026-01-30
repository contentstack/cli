import { map as _map, getCallsite, constants, safePromise } from '../utils';
// @ts-ignore - no types available
import Listr from 'listr';
// @ts-ignore - no types available
import { waterfall } from 'async';
const { requests } = constants;

// Properties
const { getMapInstance, set, get } = _map;

import ContentType from './content-types';

// Merge all classes containing migration methods into a single class
const _Migration = (_Class: typeof ContentType) => class extends _Class {};

/**
 * Migration class
 * @class Migration
 */
export default class Migration extends _Migration(ContentType) {
  /**
   * Adds custom task in migration to execute.
   * @param {Object} taskDescription Task title and task function to execute
   * @param {string} taskDescription.title Title for custom task
   * @param {array} taskDescription.task async function to be executed
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
  addTask(taskDescription: any): void {
    const { title, failMessage, successMessage } = taskDescription;
    let { tasks, task } = taskDescription;
    const callsite = getCallsite();
    const mapInstance = getMapInstance();
    // eslint-disable-next-line no-warning-comments
    // TODO: Make it better to accept only single task
    if (tasks && !Array.isArray(tasks)) tasks = [tasks];
    if (task && !Array.isArray(task)) {
      tasks = [task];
    }
    (this as any).contentTypeService.base.dispatch(callsite, null, null, tasks);
    let _requests = get(requests, mapInstance);
    const req = {
      title: title,
      failedTitle: failMessage || `Failed to execute task: ${title}`,
      successTitle: successMessage || `Successfully executed task: ${title}`,
      tasks,
    };
    _requests.push(req);
    set(requests, mapInstance, _requests);
  }

  async run(): Promise<void> {
    const mapInstance = getMapInstance();
    let _requests = get(requests, mapInstance);
    // Make calls from here
    const tasks = await this.getTasks(_requests);
    const listr = new Listr(tasks);
      await listr.run().catch((error: any) => {
        (this as any).handleErrors(error);
        // When the process is child, send error message to parent
        if (process.send) process.send({ errorOccurred: true });
      });
  }

  async getTasks(_requests: any[]): Promise<any[]> {
    const _tasks: any[] = [];
    const results: any[] = [];
    const taskFn = (reqObj: any) => {
      const { failedTitle, successTitle, tasks } = reqObj;

      return async (ctx: any, _task: any) => {
        const [err, result] = await safePromise(waterfall(tasks));
        if (err) {
          ctx.error = true;
          _task.title = failedTitle;
          throw err;
        }
        result && results.push(result);
        _task.title = successTitle;
        return result;
      };
    };

    for (const element of _requests) {
      let reqObj = element;
      const { title } = reqObj;
      const task = {
        title: title,
        task: taskFn(reqObj),
      };
      _tasks.push(task);
    }

    return _tasks;
  }
}
