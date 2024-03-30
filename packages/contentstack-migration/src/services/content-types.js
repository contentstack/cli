/* eslint-disable unicorn/explicit-length-check */
/* eslint-disable no-unused-expressions */
'use strict';

const Base = require('../modules/base');
// Utils
const { map: _map, safePromise, successHandler, errorHandler, constants, errorHelper } = require('../utils');
// Map methods
const { get, getMapInstance, getDataWithAction } = _map;
const mapInstance = getMapInstance();
const { ContentType, MANAGEMENT_SDK, actions: _actions } = constants;

class ContentTypeService {
  constructor() {
    // Stores actions required for moveField function
    this.moveFieldActions = [];
    this.base = new Base();
    this.stackSDKInstance = get(MANAGEMENT_SDK, mapInstance);
  }

  async fetchContentType(callsite, id) {
    const method = 'GET';

    const [err, result] = await safePromise(this.stackSDKInstance.contentType(id).fetch());
    if (err) {
      errorHelper(err);
      this.base.dispatch(callsite, id, err, 'apiError');
      throw err;
    }
    successHandler(id, ContentType, method);

    return result || {};
  }

  async postContentTypes(callsite, id, action) {
    const data = getDataWithAction(id, mapInstance, action);
    const [err, result] = await safePromise(this.stackSDKInstance.contentType().create(data));
    if (err) {
      errorHelper(err);
      this.base.dispatch(callsite, id, err, 'apiError');
      throw err;
    }

    successHandler(id, ContentType, 'POST');
    return result.content_type || {};
  }

  async editContentType(callsite, data) {
    const d = getDataWithAction(data.uid, mapInstance, _actions.EDIT_CT);
    data = { ...data, ...d.content_type };
    const method = 'PUT';
    const [err, result] = await safePromise(data.update());
    if (err) {
      errorHelper(err);
      this.base.dispatch(callsite, data.uid, err, 'apiError');
      throw err;
    }

    successHandler(data.uid, ContentType, method);
    return result.content_type || {};
  }

  async deleteContentType(callsite) {
    const { id } = this;
    const method = 'DELETE';
    const [err, result] = await safePromise(this.stackSDKInstance.contentType(id).delete());

    if (err) {
      errorHelper(err);
      this.base.dispatch(callsite, id, err, 'apiError');
      throw err;
    }
    successHandler(id, ContentType, method);
    return result.content_type || {};
  }

  applyActionsOnFields(callsite, data, cb) {
    const { schema } = data;
    const { moveFieldActions, mergeEditSchema } = this;
    let i = 0;
    let finalSchema;
    try {
      finalSchema = mergeEditSchema.call(this, schema);
    } catch (error) {
      this.base.dispatch(callsite, null, error, 'field');
      // Call the callback with error
      if (typeof cb === 'function') return cb(error);
    }
    data.schema = finalSchema;
    // Handle for no move field action required
    if (!moveFieldActions.length) return cb(null, data);
    // eslint-disable-next-line
    while (true) {
      /** VALIDATIONS */
      const validResult = this.getValidated(finalSchema, moveFieldActions[i]);
      if (!validResult.isValid) {
        const error = { message: `${validResult.missingField} does not exist in schema.` };
        this.base.dispatch(callsite, null, error, 'field');
        // Call the callback with error
        if (typeof cb === 'function') return cb(error);
      }

      finalSchema = this[moveFieldActions[i].action](finalSchema, moveFieldActions[i]);
      i++;
      if (!moveFieldActions[i]) break;
    }
    data.schema = finalSchema;
    if (cb) return cb(null, data);
    return data;
  }

  getActions(action) {
    this.moveFieldActions.push(action);
  }

  // Sets id and action for this instance
  setIdAndAction(id, action) {
    this.id = id;
    this.action = action;
  }

  // Merges the user specified with new fields with existing schema
  mergeEditSchema(schema = []) {
    const _mapInstance = getMapInstance();

    const { id, action } = this;

    const contentType = get(id, _mapInstance);

    let contentTypeSchema = contentType[action].content_type.schema;
    contentTypeSchema = contentTypeSchema || [];

    const indicesToRemoveFromNewSchema = [];
    const indicesToRemoveFromOldSchema = [];

    let isEditFieldValid = false;
    let isEditFieldPresent = false;
    let isDeleteFieldValid = false;
    let isDeleteFieldPresent = false;
    let fieldToRaiseExceptionAgainst;

    if (contentTypeSchema.length > 0 && schema.length > 0) {
      // If found a updated field replace the new field with the existing field
      contentTypeSchema.forEach((newSchema, i) => {
        schema.every((oldSchema, j) => {
          /** VALIDATIONS */
          if (newSchema.isEdit) {
            isEditFieldPresent = true;
            fieldToRaiseExceptionAgainst = newSchema.uid;
            newSchema.uid === oldSchema.uid && (isEditFieldValid = true);
          }

          if (newSchema.isDelete) {
            isDeleteFieldPresent = true;
            fieldToRaiseExceptionAgainst = newSchema.uid;

            newSchema.uid === oldSchema.uid && (isDeleteFieldValid = true);
          }
          /** VALIDATIONS ENDS */

          if (newSchema.uid === oldSchema.uid) {
            let tempObj = newSchema;
            indicesToRemoveFromNewSchema.push(i);
            // Handle delete action here
            if (newSchema.isDelete) {
              indicesToRemoveFromOldSchema.push(j);
            } else {
              schema.splice(j, 1, tempObj); // Replace the new schema with old schema
            }
            // break
            return false;
          }
          // continue
          return true;
        });
      });
    }

    // Raise exception if any of the following conditions are true
    if ((isEditFieldPresent && !isEditFieldValid) || (isDeleteFieldPresent && !isDeleteFieldValid)) {
      throw { message: `${fieldToRaiseExceptionAgainst} does not exist in the schema. Please check again` };
    }

    contentTypeSchema = contentTypeSchema.filter((_, i) => !indicesToRemoveFromNewSchema.includes(i));

    schema = schema.filter((_, i) => !indicesToRemoveFromOldSchema.includes(i));

    schema = schema.concat(contentTypeSchema);
    contentType[action].content_type.schema = schema;
    return schema;
  }

  toTheTop(schema, actionObj) {
    const { fieldToMove } = actionObj;
    let i = 0;
    // eslint-disable-next-line
    while (true) {
      if (schema[i].uid === fieldToMove) {
        let tempObj = schema[i];
        schema.splice(i, 1);
        schema.unshift(tempObj);
        break;
      }
      i++;
      if (!schema[i]) break; // Error handling required
    }
    return schema;
  }

  toTheBottom(schema, actionObj) {
    const { fieldToMove } = actionObj;

    let i = 0;
    // eslint-disable-next-line
    while (true) {
      if (schema[i].uid === fieldToMove) {
        let tempObj = schema[i];
        schema.splice(i, 1);
        schema.push(tempObj);
        break;
      }
      i++;
      if (!schema[i]) break;
    }
    return schema;
  }

  afterField(schema, actionObj) {
    const { fieldToMove, against } = actionObj;
    let i = 0;
    let indexToMove = 0;
    let tempObj;
    let found = 0;
    // eslint-disable-next-line
    while (true) {
      if (schema[i].uid === against) {
        indexToMove = i;
        found++;
      }
      if (schema[i].uid === fieldToMove) {
        tempObj = schema[i];
        schema.splice(i, 1);
        found++;
      }
      i++;
      if (found === 2) break;
      if (!schema[i]) break;
    }
    // TODO: Handle error
    found === 2 && schema.splice(indexToMove + 1, null, tempObj);
    return schema;
  }

  beforeField(schema, actionObj) {
    const { fieldToMove, against } = actionObj;

    let i = 0;
    let indexToMove = 0;
    let tempObj = 0;
    let found = 0;
    // eslint-disable-next-line
    while (true) {
      if (schema[i].uid === against) {
        indexToMove = i;
        found++;
      }
      if (schema[i].uid === fieldToMove) {
        tempObj = schema[i];
        schema.splice(i, 1);
        found++;
      }
      i++;
      if (found === 2) break;
      if (!schema[i]) break;
    }
    found === 2 && schema.splice(indexToMove, null, tempObj);
    return schema;
  }

  getValidated(schema, actionObj) {
    let isValid = true;
    let found = 0;
    let missingField = '';
    let i = 0;

    const { fieldToMove, against } = actionObj;
    const uids = [];
    // eslint-disable-next-line
    while (true) {
      uids.push(schema[i].uid);

      if (schema[i].uid === fieldToMove) {
        found++;
      }
      if (against === schema[i].uid) {
        found++;
      }
      i++;
      if (!schema[i]) break;
    }
    // TODO: Need a better way to handle this
    missingField = uids.includes(fieldToMove) ? null : fieldToMove;

    if (!missingField && against) {
      missingField = uids.includes(against) ? null : against;
    }

    // Handling both the scenarios
    if (found === 0 || (against && found === 1)) {
      isValid = false;
    }

    return { isValid, missingField };
  }
}

module.exports = ContentTypeService;
