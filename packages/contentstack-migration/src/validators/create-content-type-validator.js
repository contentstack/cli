'use strict';

const { keys } = Object;
// Utils
const { map: _map, constants } = require('../utils');
// Properties
const { getMapInstance, get } = _map;
const { contentTypeProperties } = constants;

const mandatoryKeys = ['uid', 'title', 'description'];

class CreateContentTypeValidator {
  constructor() {
    // super();
    this.errors = [];
  }

  validate(data) {
    // Validate the latest updated object in the global map object
    const mapInstance = getMapInstance();
    const mapObj = get(data.payload.contentTypeId, mapInstance);
    const actionObj = mapObj[data.payload.action].content_type;
    const userProvidedFields = keys(actionObj);

    for (const key of mandatoryKeys) {
      if (!keys(actionObj).includes(key) || !actionObj[key]) {
        data = { ...data, message: `${key} is missing.` };
        this.errors.push(data);
      }
    }

    // TODO: Fix error messages
    const propertyNames = this.getPropertyNames();

    for (let i = 0; i < userProvidedFields.length; i++) {
      let key = userProvidedFields[i];
      if (!propertyNames.includes(key)) {
        data = { ...data, message: `${key} is not valid property.` };
        this.errors.push(data);
      }
    }
    return this.errors;
  }

  isApplicable(action) {
    return action.type === 'create';
  }

  getPropertyNames() {
    return contentTypeProperties;
  }
}

module.exports = CreateContentTypeValidator;
