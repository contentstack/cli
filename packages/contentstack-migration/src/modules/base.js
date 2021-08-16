'use strict';

// Utils
const { map: _map, constants } = require('../utils'),
  // Actions
  { actionCreators } = require('../actions'),
  // Utils properties
  { getMapInstance, get } = _map,
  { actionMapper } = constants;

/**
 * Base class for module classes
 * @class Base
 */
class Base {
  constructor(id, action) {
    this.id = id;
    this.action = action;
    this.actions = [];
  }
  /**
   * Chained function which takes value for title
   * @param {string} value Title
   */
  title(value) {
    const mapInstance = getMapInstance(),
      { id, action } = this,

      contentType = get(id, mapInstance);

    contentType[action].content_type.title = value;

    return this;
  }

  /**
   * Chained function which takes value for description
   * @param {string} value Description
   */
  description(value) {
    const mapInstance = getMapInstance(),
      { id, action } = this,

      contentType = get(id, mapInstance);

    contentType[action].content_type.description = value;

    return this;
  }
  /**
   * Chained function takes boolean value for force while deleting content type
   * @param {boolean} value Force delete
   */
  force(value) {
    const mapInstance = getMapInstance(),
      { id, action } = this,

      contentType = get(id, mapInstance);

    contentType[action].content_type.force = value;

    return this;
  }
  /**
   * Accumulates actions for validating user provided inputs
   * @param {Object} callsite Gets the file location and file number of caller 
   * @param {string} id unique id of action type 
   * @param {Object} opts holds payload to be validated 
   * @param {string} method type of action 
   */
  dispatch(callsite, id, opts, method) {
    if (!id && !opts) {
      let mapInstance = getMapInstance(),
        actions = get(actionMapper, mapInstance), // Returns an array if empty
        action = actionCreators.customTasks(callsite, opts);
      actions.push(action);
    } else {
      let mapInstance = getMapInstance(),
        actions = get(actionMapper, mapInstance), // Returns an array if empty
        action = actionCreators.contentType[method](callsite, id, { ...opts, id });
      actions.push(action);
    }
    
  }

  getActions() {
    return this.actions;
  }
}

module.exports = Base;