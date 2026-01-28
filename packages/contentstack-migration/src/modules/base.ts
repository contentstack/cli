// Utils
import { map as _map, constants } from '../utils';
// Actions
import { actionCreators } from '../actions';
// Utils properties
const { getMapInstance, get } = _map;
const { actionMapper } = constants;

/**
 * Base class for module classes
 * @class Base
 * @ignore
 */
export default class Base {
  id: string | null;
  action: string | null;
  actions: any[];

  constructor(id?: string, action?: string) {
    this.id = id || null;
    this.action = action || null;
    this.actions = [];
  }

  /**
   * Chained function which takes value for title
   * @param {string} value Title
   * @returns {Base} current instance of inherited class
   */
  title(value: string): this {
    const mapInstance = getMapInstance();
    const { id, action } = this;

    const contentType = get(id as string, mapInstance);

    contentType[action as string].content_type.title = value;

    return this;
  }

  /**
   * Chained function which takes value for description
   * @param {string} value Description
   * @returns {Base} current instance of inherited class
   */
  description(value: string): this {
    const mapInstance = getMapInstance();
    const { id, action } = this;
    const contentType = get(id as string, mapInstance);
    contentType[action as string].content_type.description = value;
    return this;
  }

  /**
   * Chained function takes boolean value for force while deleting content type
   * @param {boolean} value Force delete
   * @returns {Base} current instance of inherited class
   */
  force(value: boolean): this {
    const mapInstance = getMapInstance();
    const { id, action } = this;

    const contentType = get(id as string, mapInstance);

    contentType[action as string].content_type.force = value;

    return this;
  }

  /**
   * Accumulates actions for validating user provided inputs
   * @ignore
   * @param {Object} callsite Gets the file location and file number of caller
   * @param {string} id unique id of action type
   * @param {Object} opts holds payload to be validated
   * @param {string} method type of action
   */
  dispatch(callsite: any, id: string | null, opts: any, method: string): void {
    if (!id && !opts) {
      let mapInstance = getMapInstance();
      let actions = get(actionMapper, mapInstance); // Returns an array if empty
      let action = actionCreators.customTasks(callsite, opts);
      actions.push(action);
    } else {
      let mapInstance = getMapInstance();
      let actions = get(actionMapper, mapInstance); // Returns an array if empty
      let action = (actionCreators.contentType as any)[method](callsite, id as string, { ...opts, id });
      actions.push(action);
    }
  }

  getActions(): any[] {
    return this.actions;
  }
}
