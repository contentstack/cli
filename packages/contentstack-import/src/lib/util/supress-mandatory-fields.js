/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var supress = module.exports = function (schema, flag) {
  for (var i in schema) {
    if (schema[i].data_type === 'group') {
      supress(schema[i].schema, flag);
    } else if (schema[i].data_type === 'blocks') {
      for (var block in schema[i].blocks) {
        supress(schema[i].blocks[block].schema, flag);
      }
    } else if (schema[i].data_type === 'reference') {
      flag.references = true;
    }

    if ((schema[i].hasOwnProperty('mandatory') && schema[i].mandatory) || (schema[i].hasOwnProperty('unique') &&
        schema[i].unique)) {
      if(schema[i].uid !== 'title') {
        schema[i].unique = false;
        schema[i].mandatory = false;
        flag.supressed = true;
      }    
    }
  }
};