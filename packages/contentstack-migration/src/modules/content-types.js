'use strict';

const Field = require('./fields'),

  // Services
  { ContentTypeService } = require('../services'),

  // Config
  { defaultOptions } = require('../config'),

  // Utils
  { map: _map, schemaHelper, constants, getCallsite } = require('../utils'),

  // Base class
  Base = require('./base'),

  // Properties
  { getMapInstance, set, get } = _map,
  { actions, requests, validationAction } = constants,
  { getUid } = schemaHelper,
  { create, edit } = validationAction;

/**
 * ContentType class
 * @class ContentType
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
   * @example
   * module.exports = {migrations} => {
   *  const blog = migrations.createContentType('blog', {
   *    title: 'blog'
   *  })
   * }
   */
  createContentType(id, opts = {}) {
    console.log('id>>>>>>>>>>\n\n\n ', id)
    const callsite = getCallsite();
    // base class method
    let options = { ...defaultOptions, ...opts}
    
    this.dispatch(callsite, id, opts, create);
    const { title, description } = opts,

      mapInstance = getMapInstance(),

      { CREATE_CT } = actions,

      uid = getUid(id);
    delete opts.title;
    const ctObj = { content_type: { title, uid, description, options } },

      ctActionObj = { [CREATE_CT]: ctObj },

      { contentTypeService } = this;
      
    // Sets data to post in map object
    set(id, mapInstance, ctActionObj);
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, CREATE_CT);
    const tasks = [contentTypeService.postContentTypes.bind(contentTypeService, callsite, id, CREATE_CT)];
    const req = { 
      title: `Adding content type: ${id}`, 
      failMessage:`Failed to create content type: ${id}`, 
      successMessage: `Successfully added content type: ${id}`, 
      tasks 
    }
    let field = new Field(id, CREATE_CT, contentTypeService, req);

    //TODO: should find better way to attach content type level methods
    field.singleton = this.singleton;
    field.isPage = this.isPage;
    return field
  }

  /**
   * Set content type to singleton or multiple
   * @param {boolean} value set value true to set content type as singleton
   */
   singleton(value){
    const mapInstance = getMapInstance(),
      { id, action } = this,
      contentType = get(id, mapInstance);

    contentType[action].content_type.options.singleton = value;
    return this;
  }

   /**
   * Set content type to singleton or multiple
   */
  isPage(value){
    const mapInstance = getMapInstance(),
      { id, action } = this,
      contentType = get(id, mapInstance);

    contentType[action].content_type.options.is_page = value;
    return this;
  }

  /**
   * Edits content type by passing content type name and options
   * @param {string} id Content type UID 
   * @param {Object} opts Optional: Content type fields definition
   * @example
   * module.exports = {migrations} => {
   *  const blog = migrations.editContentType('blog', {
   *    title: 'blog'
   *  });
   *  blog.description('Changed description');
   * }
   */
  editContentType(id) {
    const callsite = getCallsite();
    // base class method
    this.dispatch(callsite, id, {}, edit);

    const mapInstance = getMapInstance(),

      { EDIT_CT } = actions,

      uid = getUid(id),

      title = id,

      ctObj = { content_type: { uid, title } },

      ctActionObj = { [EDIT_CT]: ctObj },

      { contentTypeService } = this;

    // Sets data to update in map object
    let ctAction = get(id, mapInstance);

    set(id, mapInstance, {...ctActionObj, ...ctAction});
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, EDIT_CT);
    const tasks = [
        contentTypeService.fetchContentType.bind(contentTypeService, callsite, id),
        contentTypeService.applyActionsOnFields.bind(contentTypeService, callsite),
        contentTypeService.editContentType.bind(contentTypeService, callsite)
      ];

    const req = { 
      title: `Editing content type: ${id}`, 
      failMessage:`Failed to edit content type: ${id}`, 
      successMessage: `Successfully updated content type: ${id}`, 
      tasks 
    }

    // Keeping the same instance of contentTypeService in Field class
    return new Field(id, EDIT_CT, contentTypeService, req);
  }

  /**
   * Deletes content type by passing content type name
   * @param {string} id Content type UID 
   * @example
   * module.exports = {migrations} => {
   *  const blog = migrations.deleteContentType('blog');
   * }
   */
  deleteContentType(id) {
    const callsite = getCallsite(),

      mapInstance = getMapInstance(),

      { DELETE_CT } = actions,

      uid = getUid(id),

      ctObj = { content_type: { uid, force: false } }, // keep by default false

      ctActionObj = { [DELETE_CT]: ctObj },

      { contentTypeService } = this;

    // Sets data to delete in map object
    set(id, mapInstance, ctActionObj);
    // Sets action and id in content type service
    contentTypeService.setIdAndAction(id, DELETE_CT);
    
    const tasks = [contentTypeService.deleteContentType.bind(contentTypeService, callsite)];

    const req = { title: 'Deleting content type', tasks }

    return new Field(id, DELETE_CT, contentTypeService, req);
  }
}

module.exports = ContentType;