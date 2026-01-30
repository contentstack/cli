/* eslint-disable unicorn/explicit-length-check */
/* eslint-disable no-unused-expressions */
import Base from '../modules/base';
// Utils
import { map as _map, safePromise, successHandler, constants, errorHelper } from '../utils';
// Map methods
const { get, getMapInstance, getDataWithAction } = _map;
const mapInstance = getMapInstance();
const { ContentType, MANAGEMENT_SDK, actions: _actions } = constants;

export default class ContentTypeService {
  moveFieldActions: any[];
  base: Base;
  stackSDKInstance: any;
  id: string | undefined;
  action: string | undefined;

  constructor() {
    // Stores actions required for moveField function
    this.moveFieldActions = [];
    this.base = new Base();
    this.stackSDKInstance = get(MANAGEMENT_SDK, mapInstance);
  }

  async fetchContentType(callsite: any, id: string): Promise<any> {
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

  async postContentTypes(callsite: any, id: string, action: string): Promise<any> {
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

  async editContentType(callsite: any, data: any): Promise<any> {
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

  async deleteContentType(callsite: any): Promise<any> {
    const { id } = this;
    const method = 'DELETE';
    const [err, result] = await safePromise(this.stackSDKInstance.contentType(id as string).delete());

    if (err) {
      errorHelper(err);
      this.base.dispatch(callsite, id as string, err, 'apiError');
      throw err;
    }
    successHandler(id as string, ContentType, method);
    return result.content_type || {};
  }

  applyActionsOnFields(callsite: any, data: any, cb?: (err: any, data?: any) => void): any {
    const { schema } = data;
    const { moveFieldActions, mergeEditSchema } = this;
    let i = 0;
    let finalSchema: any;
    try {
      finalSchema = mergeEditSchema.call(this, schema);
    } catch (error) {
      this.base.dispatch(callsite, null, error, 'field');
      // Call the callback with error
      if (typeof cb === 'function') return cb(error);
    }
    data.schema = finalSchema;
    // Handle for no move field action required
    if (!moveFieldActions.length) return cb ? cb(null, data) : data;
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

      finalSchema = (this as any)[moveFieldActions[i].action](finalSchema, moveFieldActions[i]);
      i++;
      if (!moveFieldActions[i]) break;
    }
    data.schema = finalSchema;
    if (cb) return cb(null, data);
    return data;
  }

  getActions(action: any): void {
    this.moveFieldActions.push(action);
  }

  // Sets id and action for this instance
  setIdAndAction(id: string, action: string): void {
    this.id = id;
    this.action = action;
  }

  // Merges the user specified with new fields with existing schema
  mergeEditSchema(schema: any[] = []): any[] {
    const _mapInstance = getMapInstance();

    const { id, action } = this;

    const contentType = get(id as string, _mapInstance);
    
    if (!contentType || !contentType[action as string]) {
      throw { message: 'Content type not found in map' };
    }

    let contentTypeSchema = contentType[action as string].content_type.schema;
    contentTypeSchema = contentTypeSchema || [];

    const indicesToRemoveFromNewSchema: number[] = [];
    const indicesToRemoveFromOldSchema: number[] = [];

    let isEditFieldValid = false;
    let isEditFieldPresent = false;
    let isDeleteFieldValid = false;
    let isDeleteFieldPresent = false;
    let fieldToRaiseExceptionAgainst: string | undefined;

    if (contentTypeSchema.length > 0 && schema.length > 0) {
      // If found a updated field replace the new field with the existing field
      contentTypeSchema.forEach((newSchema: any, i: number) => {
        schema.every((oldSchema: any, j: number) => {
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

    contentTypeSchema = contentTypeSchema.filter((_: any, i: number) => !indicesToRemoveFromNewSchema.includes(i));

    schema = schema.filter((_: any, i: number) => !indicesToRemoveFromOldSchema.includes(i));

    schema = schema.concat(contentTypeSchema);
    contentType[action as string].content_type.schema = schema;
    return schema;
  }

  toTheTop(schema: any[], actionObj: any): any[] {
    const { fieldToMove } = actionObj;
    let i = 0;
    // eslint-disable-next-line
    while (true) {
      if (!schema[i]) break;
      if (schema[i].uid === fieldToMove) {
        let tempObj = schema[i];
        schema.splice(i, 1);
        schema.unshift(tempObj);
        break;
      }
      i++;
    }
    return schema;
  }

  toTheBottom(schema: any[], actionObj: any): any[] {
    const { fieldToMove } = actionObj;

    let i = 0;
    // eslint-disable-next-line
    while (true) {
      if (!schema[i]) break;
      if (schema[i].uid === fieldToMove) {
        let tempObj = schema[i];
        schema.splice(i, 1);
        schema.push(tempObj);
        break;
      }
      i++;
    }
    return schema;
  }

  afterField(schema: any[], actionObj: any): any[] {
    const { fieldToMove, against } = actionObj;
    let i = 0;
    let indexToMove = 0;
    let tempObj: any;
    let found = 0;
    // eslint-disable-next-line
    while (true) {
      if (!schema[i]) break;
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
    }
    // TODO: Handle error
    found === 2 && schema.splice(indexToMove + 1, null, tempObj);
    return schema;
  }

  beforeField(schema: any[], actionObj: any): any[] {
    const { fieldToMove, against } = actionObj;

    let i = 0;
    let indexToMove = 0;
    let tempObj: any = 0;
    let found = 0;
    // eslint-disable-next-line
    while (true) {
      if (!schema[i]) break;
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
    }
    found === 2 && schema.splice(indexToMove, null, tempObj);
    return schema;
  }

  getValidated(schema: any[], actionObj: any): { isValid: boolean; missingField: string | null } {
    let isValid = true;
    let found = 0;
    let missingField: string | null = '';
    let i = 0;

    const { fieldToMove, against } = actionObj;
    const uids: string[] = [];
    
    // Handle empty schema case
    if (!schema || schema.length === 0) {
      return {
        isValid: false,
        missingField: fieldToMove,
      };
    }
    
    // eslint-disable-next-line
    while (true) {
      if (!schema[i]) break;
      uids.push(schema[i].uid);

      if (schema[i].uid === fieldToMove) {
        found++;
      }
      if (against === schema[i].uid) {
        found++;
      }
      i++;
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
