/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var path = require('path');
var _ = require('lodash');

var util = require('./index');
var helper = require('./fs');
var config = util.getConfig();
// update references in entry object
module.exports = function (data, mappedUids, uidMapperPath) {
  var parent = [];
  var uids = [];
  var unmapped = [];
  var mapped = [];

  var isNewRefFields = false;
  var preserveStackVersion = config.preserveStackVersion;

  var update = function (parent, form_id, entry) {
    var _entry = entry,
      len = parent.length;
    for (var j = 0; j < len; j++) {
      if (_entry && parent[j]) {
        if (j == (len - 1) && _entry[parent[j]]) {
          if (form_id !== '_assets') {
            if (_entry[parent[j]].length) {
              _entry[parent[j]].forEach((item, idx) => {
                if (typeof item.uid === 'string' && item._content_type_uid) {
                  uids.push(item.uid);
                } else if (typeof item === 'string' && (preserveStackVersion === true)) {
                  uids.push(item);
                } else {
                  uids.push(item);
                  _entry[parent[j]][idx] = {
                    uid: item,
                    _content_type_uid: form_id
                  };
                }
              });
            }
          } else {
            if (_entry[parent[j]] instanceof Array) {
              for (var k = 0; k < _entry[parent[j]].length; k++) {
                if (_entry[parent[j]][k]['uid'].length) {
                  uids.push(_entry[parent[j]][k]['uid']);
                }
              }
            } else {
              if (_entry[parent[j]]['uid'].length) {
                uids.push(_entry[parent[j]]['uid']);
              }
            }
          }
        } else {
          _entry = _entry[parent[j]];
          var _keys = _.clone(parent).splice(eval(j + 1), len);
          if (_entry instanceof Array) {
            for (var i = 0, _i = _entry.length; i < _i; i++) {
              update(_keys, form_id, _entry[i]);
            }
          } else if (!(_entry instanceof Object)) {
            break;
          }
        }
      }
    }
  };
  var find = function (schema, entry) {
    for (var i = 0, _i = schema.length; i < _i; i++) {
      switch (schema[i].data_type) {
      case 'reference':
        if (schema[i].reference_to instanceof Array) {
          isNewRefFields = true;
          schema[i].reference_to.forEach((reference) => {
            parent.push(schema[i].uid);
            update(parent, reference, entry);
            parent.pop();            
          });
        } else {
          parent.push(schema[i].uid);
          update(parent, schema[i].reference_to, entry);
          parent.pop();
        }
        break;
      case 'group':
        parent.push(schema[i].uid);
        find(schema[i].schema, entry);
        parent.pop();
        break;
      case 'blocks':
        for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
          parent.push(schema[i].uid);
          parent.push(schema[i].blocks[j].uid);
          find(schema[i].blocks[j].schema, entry);
          parent.pop();
          parent.pop();
        }
        break;
      }
    }
  };
  find(data.content_type.schema, data.entry);
  if (isNewRefFields) {
    findUidsInNewRefFields(data.entry, uids);
  }
  uids = _.flattenDeep(uids);
  // if no references are found, return 
  if (uids.length === 0) {
    return data.entry;
  }

  uids = _.uniq(uids);
  var entry = JSON.stringify(data.entry);
  uids.forEach(function (uid) {    
    if (mappedUids.hasOwnProperty(uid)) {
      entry = entry.replace(new RegExp(uid, 'img'), mappedUids[uid]);
      mapped.push(uid);
    } else {
      unmapped.push(uid);
    }
  });

  if (unmapped.length) {
    var unmappedUids = helper.readFile(path.join(uidMapperPath, 'unmapped-uids.json'));
    unmappedUids = unmappedUids || {};
    if (unmappedUids.hasOwnProperty(data.content_type.uid)) {
      unmappedUids[data.content_type.uid][data.entry.uid] = unmapped;
    } else {
      unmappedUids[data.content_type.uid] = {
        [data.entry.uid]: unmapped
      };
    }
    // write the unmapped contents to ./mapper/language/unmapped-uids.json
    helper.writeFile(path.join(uidMapperPath, 'unmapped-uids.json'), unmappedUids);
  }

  if (mapped.length) {
    var _mappedUids = helper.readFile(path.join(uidMapperPath, 'mapped-uids.json'));
    _mappedUids = _mappedUids || {};
    if (_mappedUids.hasOwnProperty(data.content_type.uid)) {
      _mappedUids[data.content_type.uid][data.entry.uid] = mapped;
    } else {
      _mappedUids[data.content_type.uid] = {
        [data.entry.uid]: mapped
      };
    }
    // write the mapped contents to ./mapper/language/mapped-uids.json
    helper.writeFile(path.join(uidMapperPath, 'mapped-uids.json'), _mappedUids);
  }

  return JSON.parse(entry);
};

function findUidsInNewRefFields(entry, uids) {
  if (entry && typeof entry === 'object') {
    if (entry.uid && entry._content_type_uid) {
      uids.push(entry.uid);
    } else if (entry instanceof Array && entry.length) {
      entry.forEach(function(elem) {
        findUidsInNewRefFields(elem, uids);
      });
    } else if (Object.keys(entry).length) {
      for (var key in entry) {
        findUidsInNewRefFields(entry[key], uids);
      }
    }
  }
  return;
}