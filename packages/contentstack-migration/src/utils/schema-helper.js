/* eslint-disable camelcase */
'use strict';

const { version, defaultDataType, actions } = require('./constants');

exports.getSchema = (field, subAction) => {
  const { EDIT_FIELD, DELETE_FIELD } = actions;

  const schema = {
    display_name: field,
    uid: this.getUid(field),
    data_type: defaultDataType, // This will be overridden if user specifies data type
    mandatory: this.getMandatoryVal(field),
    unique: this.getUniqueVal(field),
    field_metadata: this.getFieldMetaData(field),
    non_localizable: false,
    // isDelete: !!isDelete,
    isDelete: subAction === DELETE_FIELD,
    isEdit: subAction === EDIT_FIELD,
  };
  return schema;
};

exports.getUid = (data) => data.split(' ').join('_').toLowerCase();

exports.getMandatoryVal = (data) => data.toLowerCase() === 'title' || data.toLowerCase() === 'url';

exports.getUniqueVal = (data) => data.toLowerCase() === 'title' || data.toLowerCase() === 'url';

exports.getFieldMetaData = (data) => {
  return {
    _default: this.getMandatoryVal(data),
    version,
  };
};
