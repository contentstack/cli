// Utils
import { map as _map, schemaHelper, constants } from '../utils';

// Utils Properties
const { getMapInstance, get } = _map;
const { getSchema } = schemaHelper;
const {
  data_type,
  mandatory,
  _default,
  unique,
  display_name,
  field_metadata,
  reference_to,
  actions: _actions,
  taxonomies,
  multiple,
} = constants;

// Base class
import Base from './base';

/**
 * Field class
 * @class Field
 */
export default class Field extends Base {
  uid: string;
  action: string;
  contentTypeService: any;
  request: any;
  field: string | undefined;
  fieldToMove: string | undefined;
  singleton?: (value: boolean) => this;
  isPage?: (value: boolean) => this;

  // prop, value
  constructor(uid: string, action: string, contentTypeService: any, request: any) {
    super(uid);
    this.uid = uid;
    this.action = action;
    this.contentTypeService = contentTypeService;
    this.request = request;
  }

  /**
   * @typedef {Object} Task
   * @param {string} title - Title for custom task
   * @param {function[]} task - array of async function to be executed
   * @param {string} failMessage message to be printed when task fails
   * @param {string} successMessage - message to be printed when task succeeds
   */

  /**
   * Creates a field with provided uid.
   * @param {string} field Field name to be created
   * @param {Object} opts Options to be passed
   * @returns {Field} current instance of field object to chain further methods.
   * @example
   * module.exports =({ migration })=> {
   *  const blog = migration.editContentType('blog');
   *
   *  blog.createField('author')
   *   .display_name('Author')
   *   .data_type('text')
   *   .mandatory(false);
   * };
   * 
   * Create a taxonomy field
   * 
   *  module.exports =({ migration })=> {
   *  const blog = migration.editContentType('blog');
   *
   *  blog.createField('taxonomies')
   *   .display_name('Taxonomy1')
   *   .data_type('taxonomy')
   *   .taxonomies([{ "taxonomy_uid": "test_taxonomy1", "max_terms": 2, "mandatory": false}])
   *   .multiple(true)
   *   .mandatory(false);
   * };
   */
  createField(field: string, opts?: any): this {
    this.updateContentTypeSchema(field);

    // Build schema from options provided
    if (opts && Object.keys(opts).length) {
      this.getSchemaFromOptions(opts, field);
      return this;
    }
    return this;
  }

  /**
   * Edits the field with provided uid.
   * @param {string} field Field name to be edited
   * @param {Object} opts Options to be passed
   * @returns {Field} current instance of field object to chain further methods.
   * @example
   * module.exports =({ migration })=> {
   * const blog = migration.editContentType('blog');
   *
   * blog.editField('uniqueid')
   *   .display_name('Unique ID')
   *   .mandatory(false);
   * };
   */
  editField(field: string, opts?: any): this {
    const { EDIT_FIELD } = _actions;
    this.updateContentTypeSchema(field, EDIT_FIELD);

    // Build schema from options provided
    if (opts && Object.keys(opts).length) {
      this.getSchemaFromOptions(opts, field);
      return this;
    }
    return this;
  }

  /**
   * Delete a field from the content type
   * @param {string} field Field uid to be deleted
   * @returns {Field} current instance of field object to chain further methods.
   * @example
   * module.exports =({ migration })=> {
   *  const blog = migration.editContentType('blog');
   *
   *  blog.deleteField('uniqueid');
   * };
   */
  deleteField(field: string): this {
    const { DELETE_FIELD } = _actions;
    this.updateContentTypeSchema(field, DELETE_FIELD);

    return this;
  }

  /**
   * Move the field (position of the field in the editor)
   * @param {string} field Field uid to be moved
   * @returns {Field} current instance of field object to chain further methods.
   * @example
   * module.exports = ({migration}) => {
   *  const blog = migration.editContentType('blog');
   *
   *  blog.createField('credits')
   *    .display_name('Credits')
   *    .data_type('text')
   *    .mandatory(false);
   *
   *  blog.createField('references')
   *    .display_name('References')
   *    .data_type('text')
   *    .mandatory(false);
   *
   *  blog.moveField('uniqueid').toTheBottom();
   *  blog.moveField('references').beforeField('credits');
   *  blog.moveField('author').toTheTop();
   *  blog.moveField('url').afterField('author');
   * };
   */
  moveField(field: string): this {
    this.fieldToMove = field;
    return this;
  }

  updateContentTypeSchema(field: string, subAction?: string): void {
    const mapInstance = getMapInstance();

    const { uid, action } = this;

    const contentType = get(uid, mapInstance);

    let contentTypeSchema = contentType[action].content_type.schema;
    contentTypeSchema = contentTypeSchema || [];

    const schemaObj = getSchema(field, subAction);
    contentTypeSchema.push(schemaObj);

    contentType[action].content_type.schema = contentTypeSchema;

    this.field = schemaObj.uid;
  }

  // changeFieldId(currentId, newId) { }

  /**
   *
   * @param {string} value set display name for the field
   * @returns {Field} current instance of field object to chain further methods.
   */
  display_name(value: string): this {
    this.buildSchema(display_name, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {string} value Set data type of the field e.g. text, json, boolean
   * @returns {Field} current instance of field object to chain further methods.
   */
  data_type(value: string): this {
    this.buildSchema(data_type, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {boolean} value set true when field is mandatory
   * @returns {Field} current instance of field object to chain further methods.
   */
  mandatory(value: boolean): this {
    this.buildSchema(mandatory, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {string|boolean|number} value set true when field is mandatory
   * @returns {Field} current instance of field object to chain further methods.
   */
  default(value: string | boolean | number): this {
    this.buildSchema(_default, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {boolean} value set true if field is unique
   * @returns {Field} current instance of field object to chain further methods.
   */
  unique(value: boolean): this {
    this.buildSchema(unique, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {string | string[]} value uid of reference content type set array if ref_multipleContentType true
   * @see {@link ref_multipleContentType}
   * @returns {Field} current instance of field object to chain further methods.
   */
  reference_to(value: string | string[]): this {
    this.buildSchema(reference_to, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {string} value set true if accepts multiple entries as reference
   * @returns {Field} current instance of field object to chain further methods.
   */
  ref_multiple(value: boolean): this {
    this.buildSchema(field_metadata, this.field as string, { ref_multiple: value, ref_multiple_content_types: true });
    return this;
  }

  /**
   * The 'taxonomies' property should contain at least one taxonomy object
   * @param {string | string[]} value list of taxonomies.
   * @returns {Field} current instance of field object to chain further methods.
   */
  taxonomies(value: any): this {
    this.buildSchema(taxonomies, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {boolean} value set true if field is multiple
   * @returns {Field} current instance of field object to chain further methods.
   */
  multiple(value: boolean): this {
    this.buildSchema(multiple, this.field as string, value);
    return this;
  }

  /**
   *
   * @param {boolean} value set true if refer to multiple content types
   * @returns {Field} current instance of field object to chain further methods.
   */
  ref_multipleContentType(value: boolean): this {
    this.buildSchema(field_metadata, this.field as string, { ref_multiple_content_types: value });
    return this;
  }

  toTheBottom(): void {
    const { fieldToMove, contentTypeService } = this;

    if (!fieldToMove) throw new Error('Cannot access this method directly.');

    contentTypeService.getActions({ action: 'toTheBottom', fieldToMove });
  }

  toTheTop(): void {
    const { fieldToMove, contentTypeService } = this;
    if (!fieldToMove) throw new Error('Cannot access this method directly.');

    contentTypeService.getActions({ action: 'toTheTop', fieldToMove });
  }

  afterField(field: string): void {
    const { fieldToMove, contentTypeService } = this;

    if (!fieldToMove) throw new Error('Cannot access this method directly.');

    contentTypeService.getActions({ action: 'afterField', fieldToMove, against: field });
  }

  beforeField(field: string): void {
    const { fieldToMove, contentTypeService } = this;

    if (!fieldToMove) throw new Error('Cannot access this method directly.');

    contentTypeService.getActions({ action: 'beforeField', fieldToMove, against: field });
  }

  buildSchema(prop: string, field: string, value: any): void {
    const mapInstance = getMapInstance();

    const { uid, action } = this;

    const contentType = get(uid, mapInstance);

    for (const _schema of contentType[action].content_type.schema) {
      if (_schema.uid === field) {
        _schema[prop] = value;
        break;
      }
    }
  }

  /**
   * Once you add the fields to content type you can call this method to get the task definition
   * @returns {Task} This task definition is to pass to migration.addTask()
   * @example
   * migration.addTask(foo.getTaskDefinition())
   */
  getTaskDefinition(): any {
    return this.request;
  }

  getSchemaFromOptions(opts: any, field: string): void {
    const allKeys = Object.keys(opts);
    allKeys.forEach((_key: string) => {
      this.buildSchema(_key, field, opts[_key]);
    });
  }
}
