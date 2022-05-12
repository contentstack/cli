/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

// eslint-disable-next-line unicorn/filename-case
var path = require('path')
var _ = require('lodash')

var util = require('.')
var helper = require('./fs')
var config = util.getConfig()
// update references in entry object
module.exports = function (data, mappedUids, uidMapperPath) {
  var parent = []
  var uids = []
  var unmapped = []
  var mapped = []

  var isNewRefFields = false
  var preserveStackVersion = config.preserveStackVersion

  function gatherJsonRteEntryIds(jsonRteData) {
    jsonRteData.children.forEach(element => {
      if (element.type) {
        switch (element.type) {
          case 'p': {
            if (element.children && element.children.length > 0) {
              gatherJsonRteEntryIds(element)
            }
            break;
          }
          case 'reference': {
            if (Object.keys(element.attrs).length > 0 && element.attrs.type === "entry") {
              uids.push(element.attrs['entry-uid'])
            }
            break;
          }
        }
      }
    })
  }

  var update = function (parent, form_id, entry) {
    var _entry = entry
    var len = parent.length
    for (var j = 0; j < len; j++) {
      if (_entry && parent[j]) {
        if (j === (len - 1) && _entry[parent[j]]) {
          if (form_id !== '_assets') {
            if (_entry[parent[j]].length) {
              _entry[parent[j]].forEach((item, idx) => {
                if (typeof item.uid === 'string' && item._content_type_uid) {
                  uids.push(item.uid)
                } else if (typeof item === 'string' && (preserveStackVersion === true)) {
                  uids.push(item)
                } else {
                  uids.push(item)
                  _entry[parent[j]][idx] = {
                    uid: item,
                    _content_type_uid: form_id,
                  }
                }
              })
            }
          } else if (Array.isArray(_entry[parent[j]])) {
            for (var k = 0; k < _entry[parent[j]].length; k++) {
              if (_entry[parent[j]][k].uid.length) {
                uids.push(_entry[parent[j]][k].uid)
              }
            }
          } else if (_entry[parent[j]].uid.length) {
            uids.push(_entry[parent[j]].uid)
          }
        } else {
          _entry = _entry[parent[j]]
          var _keys = _.clone(parent).splice(eval(j + 1), len)
          if (Array.isArray(_entry)) {
            for (var i = 0, _i = _entry.length; i < _i; i++) {
              update(_keys, form_id, _entry[i])
            }
          } else if (!(_entry instanceof Object)) {
            break
          }
        }
      }
    }
  }
  var find = function (schema, entry) {
    for (var i = 0, _i = schema.length; i < _i; i++) {
      switch (schema[i].data_type) {
      case 'reference':
        if (Array.isArray(schema[i].reference_to)) {
          isNewRefFields = true
          schema[i].reference_to.forEach(reference => {
            parent.push(schema[i].uid)
            update(parent, reference, entry)
            parent.pop()
          })
        } else {
          parent.push(schema[i].uid)
          update(parent, schema[i].reference_to, entry)
          parent.pop()
        }
        break
      case 'group':
        parent.push(schema[i].uid)
        find(schema[i].schema, entry)
        parent.pop()
        break
      case 'blocks':
        for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
          parent.push(schema[i].uid)
          parent.push(schema[i].blocks[j].uid)
          find(schema[i].blocks[j].schema, entry)
          parent.pop()
          parent.pop()
        }
        break
      case 'json':
        if (schema[i].field_metadata.rich_text_type) {
          if (uids.length === 0) {
            findEntryIdsFromJsonRte(data.entry, data.content_type.schema)
          }
        }
        break
      }
    }
  }

  function findEntryIdsFromJsonRte(entry, ctSchema) {
    for (let i = 0; i < ctSchema.length; i++) {
      switch (ctSchema[i].data_type) {
        case 'blocks': {
          if (entry[ctSchema[i].uid]) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(e => {
                let key = Object.keys(e).pop()
                let subBlock = ctSchema[i].blocks.filter(e => e.uid === key).pop()
                findEntryIdsFromJsonRte(e[key], subBlock.schema)
              })
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[ctSchema[i].uid]) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(e => {
                findEntryIdsFromJsonRte(e, ctSchema[i].schema)
              })
            } else {
              findEntryIdsFromJsonRte(entry[ctSchema[i].uid], ctSchema[i].schema)
            }
          }
          break;
        }
        case 'json': {
          if (entry[ctSchema[i].uid] && ctSchema[i].field_metadata.rich_text_type) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(jsonRteData => {
                gatherJsonRteEntryIds(jsonRteData)
              })
            } else {
              gatherJsonRteEntryIds(entry[ctSchema[i].uid])
            }
          }
          break;
        }
      }
    }
  }

  find(data.content_type.schema, data.entry)
  if (isNewRefFields) {
    findUidsInNewRefFields(data.entry, uids)
  }
  uids = _.flattenDeep(uids)
  // if no references are found, return
  if (uids.length === 0) {
    return data.entry
  }

  uids = _.uniq(uids)
  var entry = JSON.stringify(data.entry)
  uids.forEach(function (uid) {
    if (mappedUids.hasOwnProperty(uid)) {
      entry = entry.replace(new RegExp(uid, 'img'), mappedUids[uid])
      mapped.push(uid)
    } else {
      unmapped.push(uid)
    }
  })

  if (unmapped.length > 0) {
    var unmappedUids = helper.readFile(path.join(uidMapperPath, 'unmapped-uids.json'))
    unmappedUids = unmappedUids || {}
    if (unmappedUids.hasOwnProperty(data.content_type.uid)) {
      unmappedUids[data.content_type.uid][data.entry.uid] = unmapped
    } else {
      unmappedUids[data.content_type.uid] = {
        [data.entry.uid]: unmapped,
      }
    }
    // write the unmapped contents to ./mapper/language/unmapped-uids.json
    helper.writeFile(path.join(uidMapperPath, 'unmapped-uids.json'), unmappedUids)
  }

  if (mapped.length > 0) {
    var _mappedUids = helper.readFile(path.join(uidMapperPath, 'mapped-uids.json'))
    _mappedUids = _mappedUids || {}
    if (_mappedUids.hasOwnProperty(data.content_type.uid)) {
      _mappedUids[data.content_type.uid][data.entry.uid] = mapped
    } else {
      _mappedUids[data.content_type.uid] = {
        [data.entry.uid]: mapped,
      }
    }
    // write the mapped contents to ./mapper/language/mapped-uids.json
    helper.writeFile(path.join(uidMapperPath, 'mapped-uids.json'), _mappedUids)
  }

  return JSON.parse(entry)
}

function findUidsInNewRefFields(entry, uids) {
  if (entry && typeof entry === 'object') {
    if (entry.uid && entry._content_type_uid) {
      uids.push(entry.uid)
    } else if (Array.isArray(entry) && entry.length) {
      entry.forEach(function (elem) {
        findUidsInNewRefFields(elem, uids)
      })
    } else if (Object.keys(entry).length) {
      for (var key in entry) {
        if (key) {
          findUidsInNewRefFields(entry[key], uids)
        }
      }
    }
  }
}
