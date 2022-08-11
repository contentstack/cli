'use strict';

exports.getEntryObj = (fields, obj) => {
  let entryObj = {};
  fields.forEach((field) => {
    entryObj[field] = obj[field];
  });
  return entryObj;
};
