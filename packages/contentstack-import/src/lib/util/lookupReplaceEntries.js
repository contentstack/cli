/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

// eslint-disable-next-line unicorn/filename-case
const path = require('path');
const _ = require('lodash');

const util = require('.');
const helper = require('./fs');
const config = util.getConfig();
// update references in entry object
module.exports = function (data, mappedUids, uidMapperPath) {
  let parent = [];
  let uids = [];
  let unmapped = [];
  let mapped = [];

  let isNewRefFields = false;
  let preserveStackVersion = config.preserveStackVersion;

  function gatherJsonRteEntryIds(jsonRteData) {
    jsonRteData.children.forEach((element) => {
      if (element.type) {
        switch (element.type) {
          case 'a':
          case 'p': {
            if (element.children && element.children.length > 0) {
              gatherJsonRteEntryIds(element);
            }
            break;
          }
          case 'reference': {
            if (Object.keys(element.attrs).length > 0 && element.attrs.type === 'entry') {
              if (uids.indexOf(element.attrs['entry-uid']) === -1) {
                uids.push(element.attrs['entry-uid']);
              }
            }
            if (element.children && element.children.length > 0) {
              gatherJsonRteEntryIds(element);
            }
            break;
          }
        }
      }
    });
  }

  const update = function (_parent, form_id, updateEntry) {
    let _entry = updateEntry;
    let len = _parent.length;

    for (let j = 0; j < len; j++) {
      if (_entry && _parent[j]) {
        if (j === len - 1 && _entry[_parent[j]]) {
          if (form_id !== '_assets') {
            if (_entry[_parent[j]].length) {
              _entry[_parent[j]].forEach((item, idx) => {
                if (typeof item.uid === 'string' && item._content_type_uid) {
                  uids.push(item.uid);
                } else if (typeof item === 'string' && preserveStackVersion === true) {
                  uids.push(item);
                } else {
                  uids.push(item);
                  _entry[_parent[j]][idx] = {
                    uid: item,
                    _content_type_uid: form_id,
                  };
                }
              });
            }
          } else if (Array.isArray(_entry[_parent[j]])) {
            for (const element of _entry[_parent[j]]) {
              if (element.uid.length) {
                uids.push(element.uid);
              }
            }
          } else if (_entry[_parent[j]].uid.length) {
            uids.push(_entry[_parent[j]].uid);
          }
        } else {
          _entry = _entry[_parent[j]];
          let _keys = _.clone(_parent).splice(j + 1, len);
          if (Array.isArray(_entry)) {
            for (let i = 0, _i = _entry.length; i < _i; i++) {
              update(_keys, form_id, _entry[i]);
            }
          } else if (!(_entry instanceof Object)) {
            break;
          }
        }
      }
    }
  };
  const find = function (schema, _entry) {
    for (let i = 0, _i = schema.length; i < _i; i++) {
      switch (schema[i].data_type) {
        case 'reference':
          if (Array.isArray(schema[i].reference_to)) {
            isNewRefFields = true;
            schema[i].reference_to.forEach((reference) => {
              parent.push(schema[i].uid);
              update(parent, reference, _entry);
              parent.pop();
            });
          } else {
            parent.push(schema[i].uid);
            update(parent, schema[i].reference_to, _entry);
            parent.pop();
          }
          break;
        case 'global_field':
        case 'group':
          parent.push(schema[i].uid);
          find(schema[i].schema, _entry);
          parent.pop();
          break;
        case 'blocks':
          for (let j = 0, _j = schema[i].blocks.length; j < _j; j++) {
            parent.push(schema[i].uid);
            parent.push(schema[i].blocks[j].uid);
            find(schema[i].blocks[j].schema, _entry);
            parent.pop();
            parent.pop();
          }
          break;
        case 'json':
          if (schema[i].field_metadata.rich_text_type) {
            findEntryIdsFromJsonRte(data.entry, data.content_type.schema);
          }
          break;
      }
    }
  };

  function findEntryIdsFromJsonRte(entry, ctSchema) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid].forEach((e) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((e) => e.uid === key).pop();
                findEntryIdsFromJsonRte(e[key], subBlock.schema);
              });
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid].forEach((e) => {
                findEntryIdsFromJsonRte(e, element.schema);
              });
            } else {
              findEntryIdsFromJsonRte(entry[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entry[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entry[element.uid].forEach((jsonRteData) => {
                gatherJsonRteEntryIds(jsonRteData);
              });
            } else {
              gatherJsonRteEntryIds(entry[element.uid]);
            }
          }
          break;
        }
      }
    }
  }

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
  let entry = JSON.stringify(data.entry);
  uids.forEach(function (uid) {
    if (mappedUids.hasOwnProperty(uid)) {
      entry = entry.replace(new RegExp(uid, 'img'), mappedUids[uid]);
      mapped.push(uid);
    } else {
      unmapped.push(uid);
    }
  });

  if (unmapped.length > 0) {
    let unmappedUids = helper.readFileSync(path.join(uidMapperPath, 'unmapped-uids.json'));
    unmappedUids = unmappedUids || {};
    if (unmappedUids.hasOwnProperty(data.content_type.uid)) {
      unmappedUids[data.content_type.uid][data.entry.uid] = unmapped;
    } else {
      unmappedUids[data.content_type.uid] = {
        [data.entry.uid]: unmapped,
      };
    }
    // write the unmapped contents to ./mapper/language/unmapped-uids.json
    helper.writeFile(path.join(uidMapperPath, 'unmapped-uids.json'), unmappedUids);
  }

  if (mapped.length > 0) {
    let _mappedUids = helper.readFileSync(path.join(uidMapperPath, 'mapped-uids.json'));
    _mappedUids = _mappedUids || {};
    if (_mappedUids.hasOwnProperty(data.content_type.uid)) {
      _mappedUids[data.content_type.uid][data.entry.uid] = mapped;
    } else {
      _mappedUids[data.content_type.uid] = {
        [data.entry.uid]: mapped,
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
    } else if (Array.isArray(entry) && entry.length) {
      entry.forEach(function (elem) {
        findUidsInNewRefFields(elem, uids);
      });
    } else if (Object.keys(entry).length) {
      for (let key in entry) {
        if (key) {
          findUidsInNewRefFields(entry[key], uids);
        }
      }
    }
  }
}
