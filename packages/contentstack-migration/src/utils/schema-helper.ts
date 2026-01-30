/* eslint-disable camelcase */
import { version, defaultDataType, actions } from './constants';

export const getUid = (data: string): string => data.split(' ').join('_').toLowerCase();

export const getMandatoryVal = (data: string): boolean => data.toLowerCase() === 'title' || data.toLowerCase() === 'url';

export const getUniqueVal = (data: string): boolean => data.toLowerCase() === 'title' || data.toLowerCase() === 'url';

export const getFieldMetaData = (data: string): any => {
  return {
    _default: getMandatoryVal(data),
    version,
  };
};

export const getSchema = (field: string, subAction: string): any => {
  const { EDIT_FIELD, DELETE_FIELD } = actions;

  const schema = {
    display_name: field,
    uid: getUid(field),
    data_type: defaultDataType, // This will be overridden if user specifies data type
    mandatory: getMandatoryVal(field),
    unique: getUniqueVal(field),
    field_metadata: getFieldMetaData(field),
    non_localizable: false,
    // isDelete: !!isDelete,
    isDelete: subAction === DELETE_FIELD,
    isEdit: subAction === EDIT_FIELD,
  };
  return schema;
};
