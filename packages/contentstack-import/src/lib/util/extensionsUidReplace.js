/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */


var path = require('path');

var helper = require('./fs');
var util = require('../util/');
var config = util.getConfig();
var extensionPath = path.resolve(config.data, 'mapper/extensions', 'uid-mapping.json');
var globalfieldsPath = path.resolve(config.data, 'mapper/globalfields', 'uid-mapping.json');


var extension_uid_Replace = module.exports = function (schema, preserveStackVersion) {
  for (var i in schema) {
    if (schema[i].data_type === 'group') {
      extension_uid_Replace(schema[i].schema, preserveStackVersion);
    } else if (schema[i].data_type === 'blocks') {
      for (var block in schema[i].blocks) {
        if(schema[i].blocks[block].hasOwnProperty('reference_to')) {
          delete schema[i].blocks[block].schema;
        } else {
          extension_uid_Replace(schema[i].blocks[block].schema, preserveStackVersion);
        }
      }
    } else if(schema[i].data_type === 'reference' && !schema[i].field_metadata.hasOwnProperty('ref_multiple_content_types')) {
      if (preserveStackVersion) {
        // do nothing
      } else {
        schema[i]['reference_to'] = [schema[i].reference_to];
        schema[i]['field_metadata']['ref_multiple_content_types'] = true;
      }
    } else if(schema[i].data_type === 'global_field') {
      var global_fields_key_value = schema[i]['reference_to'];
      var global_fields_data = helper.readFile(path.join(globalfieldsPath));
      if(global_fields_data && global_fields_data.hasOwnProperty(global_fields_key_value)) {
        schema[i]['reference_to'] = global_fields_data[global_fields_key_value];
      }
    } else {
      if(schema[i].hasOwnProperty('extension_uid')) {
        var extension_key_value = schema[i]['extension_uid'];
        var data = helper.readFile(path.join(extensionPath));
        if(data && data.hasOwnProperty(extension_key_value)) {
          schema[i]['extension_uid'] = data[extension_key_value];
        }             
      }
    }
  }
};
