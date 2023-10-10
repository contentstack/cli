/* eslint-disable camelcase */
'use strict';

const Field = require('./fields');

// Services
const { ContentTypeService } = require('../services');

// Config
const { defaultOptions } = require('../config');

// Utils
const { map: _map, schemaHelper, constants, getCallsite } = require('../utils');

// Base class
const Base = require('./base');

// Properties
const { getMapInstance, set, get } = _map;
const { actions, validationAction } = constants;
const { getUid } = schemaHelper;
const { create, edit } = validationAction;

/**
 * ContentType class
 * @class ContentType
 * @augments Base
 */
class ContentType extends Base {
  constructor() {
    super();
    this.contentTypeService = new ContentTypeService();
  }

  /**
   * Creates content type by passing content type name and options
   * @param {string} id Content type UID
   * @param {Object} opts Optional: Content type fields definition
   * @returns {Field} instance of Field
   * @example
   * module.exports = ({migration}) => {
   *  const blog = migration
   *    .createContentType('blog')
   *    .title('blog title')
   *    .description('blog 1')
   *  blog.createField('title').display_name('Title').data_type('text').mandatory(true);
   * }
   */
  createContentType(id, opts = {}) {
    const callsite = getCallsite();
    // base class method
    let options = { ...defaultOptions, ...opts };
    delete options.title;
    delete options.description;
    this.dispatch(callsite, id, opts, create);
    const { title, description } = opts;
    const mapInstance = getMapInstance();

    const { CREATE_CT } = actions;
    const uid = getUid(id);

    const ctObj = { content_type: { title, uid, description, options } };

    const ctActionObj = { [CREATE_CT]: ctObj };

    const { contentTypeService } = this;
    // Sets data to post in map object
    set(id, mapInstance, ctActionObj);
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, CREATE_CT);
    const tasks = [contentTypeService.postContentTypes.bind(contentTypeService, callsite, id, CREATE_CT)];
    const req = {
      title: `Adding content type: ${id}`,
      failMessage: `Failed to create content type: ${id}`,
      successMessage: `Successfully added content type: ${id}`,
      tasks,
    };
    let field = new Field(id, CREATE_CT, contentTypeService, req);
    // TODO: should find better way to attach content type level methods
    field.singleton = this.singleton;
    field.isPage = this.isPage;
    return field;
  }

  /**
   * Set content type to singleton or multiple
   * @param {boolean} value set value true to set content type as singleton default it is multiple
   * @returns {ContentType} instance of ContentType for chaining
   */
  singleton(value) {
    const mapInstance = getMapInstance();
    const { id, action } = this;
    const contentType = get(id, mapInstance);

    contentType[action].content_type.options.singleton = value;
    return this;
  }

  /**
   * Set content type to singleton or multiple
   * @param {boolean} value set value false to set content type as content as block default true
   * @returns {ContentType} instance of ContentType for chaining
   */
  isPage(value) {
    const mapInstance = getMapInstance();
    const { id, action } = this;
    const contentType = get(id, mapInstance);

    contentType[action].content_type.options.is_page = value;
    return this;
  }

  /**
   * Edits content type by passing content type name and options
   * @param {string} id Content type UID
   * @param {Object} opts Optional: Content type fields definition
   * @returns {Field} instance of Field
   * @example
   * module.exports = ({migration}) => {
   *  const blog = migration.editContentType('blog');
   *  blog.description('Changed description');
   * }
   */
  editContentType(id, opts = {}) {
    let options = { ...defaultOptions, ...opts };
    delete options.title;
    delete options.description;

    const callsite = getCallsite();
    // base class method
    this.dispatch(callsite, id, {}, edit);
    const { title, description } = opts;
    const mapInstance = getMapInstance();

    const { EDIT_CT } = actions;

    const uid = id;

    const ctObj = { content_type: { title, uid, description, options } };
    const ctActionObj = { [EDIT_CT]: ctObj };

    const { contentTypeService } = this;

    // Sets data to update in map object
    let ctAction = get(id, mapInstance);

    set(id, mapInstance, { ...ctActionObj, ...ctAction });
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, EDIT_CT);
    const tasks = [
      contentTypeService.fetchContentType.bind(contentTypeService, callsite, id),
      contentTypeService.applyActionsOnFields.bind(contentTypeService, callsite),
      contentTypeService.editContentType.bind(contentTypeService, callsite),
    ];

    const req = {
      title: `Editing content type: ${id}`,
      failMessage: `Failed to edit content type: ${id}`,
      successMessage: `Successfully updated content type: ${id}`,
      tasks,
    };

    // Keeping the same instance of contentTypeService in Field class
    let fieldI = new Field(id, EDIT_CT, contentTypeService, req);
    // TODO: should find better way to attach content type level methods
    fieldI.singleton = this.singleton;
    fieldI.isPage = this.isPage;
    return fieldI;
  }

  /**
   * Deletes content type by passing content type name
   * @param {string} id Content type UID
   * @returns {Field} instance of Field
   * @example
   * module.exports = {migrations} => {
   *  const blog = migrations.deleteContentType('blog');
   * }
   */
  deleteContentType(id) {
    const callsite = getCallsite();

    const mapInstance = getMapInstance();

    const { DELETE_CT } = actions;

    const uid = getUid(id);

    const ctObj = { content_type: { uid, force: false } }; // keep by default false

    const ctActionObj = { [DELETE_CT]: ctObj };

    const { contentTypeService } = this;

    // Sets data to delete in map object
    set(id, mapInstance, ctActionObj);
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, DELETE_CT);

    const tasks = [contentTypeService.deleteContentType.bind(contentTypeService, callsite)];

    const req = { title: 'Deleting content type', tasks };

    return new Field(id, DELETE_CT, contentTypeService, req);
  }
}

module.exports = ContentType;
