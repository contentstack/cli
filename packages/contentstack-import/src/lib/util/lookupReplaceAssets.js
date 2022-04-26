/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

var url = require('url');
var path = require('path');
var _ = require('lodash');
var marked = require('marked');

var helper = require('./fs');

// get assets object
module.exports = function (data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath) {
  if (!_.has(data, 'entry') || !_.has(data, 'content_type') || !_.isPlainObject(mappedAssetUids) || !_.isPlainObject(
    mappedAssetUrls) || typeof assetUidMapperPath !== 'string') {
    throw new Error('Invalid inputs for lookupAssets!');
  }
  var parent = [];
  var assetUids = [];
  var assetUrls = [];
  var unmatchedUids = [];
  var unmatchedUrls = [];
  var matchedUids = [];
  var matchedUrls = [];

  var find = function (schema, entry) {
    for (var i = 0, _i = schema.length; i < _i; i++) {
      if ((schema[i].data_type === 'text' && schema[i].field_metadata && (schema[i].field_metadata.markdown ||
          schema[i].field_metadata.rich_text_type))) {
        parent.push(schema[i].uid);
        findFileUrls(schema[i], entry, assetUrls);
        parent.pop();
      }
      if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
        parent.push(schema[i].uid);
        find(schema[i].schema, entry);
        parent.pop();
      }
      if (schema[i].data_type === 'blocks') {
        for (var j = 0, _j = schema[i].blocks.length; j < _j; j++) {
          if(schema[i].blocks[j].schema) {
            parent.push(schema[i].uid);
            parent.push(schema[i].blocks[j].uid);
            find(schema[i].blocks[j].schema, entry);
            parent.pop();
            parent.pop();
          }
        }
      }
      // added rich_text_type field check because some marketplace extensions also
      // have data_type has json
      if (schema[i].data_type === "json" && schema[i].field_metadata.rich_text_type) {
        parent.push(schema[i].uid)
        // findFileUrls(schema[i], entry, assetUrls)
        if (assetUids.length === 0) {
          findAssetIdsFromJsonRte(data.entry, data.content_type.schema)
        }
        // maybe only one of these checks would be enough
        parent.pop()
      }
    }
  };

  function findAssetIdsFromJsonRte(entry, ctSchema) {
    for (let i = 0; i < ctSchema.length; i++) {
      switch (ctSchema[i].data_type) {
        case 'blocks': {
          if (entry[ctSchema[i].uid] !== undefined) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(e => {
                let key = Object.keys(e).pop()
                let subBlock = ctSchema[i].blocks.filter(e => e.uid === key).pop()
                findAssetIdsFromJsonRte(e[key], subBlock.schema)
              })
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entry[ctSchema[i].uid] !== undefined) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(e => {
                findAssetIdsFromJsonRte(e, ctSchema[i].schema)
              })
            } else {
              findAssetIdsFromJsonRte(entry[ctSchema[i].uid], ctSchema[i].schema)
            }
          }
          break;
        }
        case 'json': {
          if (entry[ctSchema[i].uid] !== undefined) {
            if (ctSchema[i].multiple) {
              entry[ctSchema[i].uid].forEach(jsonRteData => {
                gatherJsonRteAssetIds(jsonRteData)
              })
            } else {
              gatherJsonRteAssetIds(entry[ctSchema[i].uid])
            }
          }
          break;
        }
      }
    }
  }

  function gatherJsonRteAssetIds(jsonRteData) {
    jsonRteData.children.forEach(element => {
      if (element.type) {
        switch (element.type) {
          case 'p': {
            if (element.children && element.children.length > 0) {
              gatherJsonRteAssetIds(element)
            }
            break;
          }
          case 'reference': {
            if (Object.keys(element.attrs).length > 0 && element.attrs.type === "asset") {
              assetUids.push(element.attrs['asset-uid'])
              assetUrls.push(element.attrs['asset-link'])
            }
            break;
          }
        }
      }
    })
  }

  find(data.content_type.schema, data.entry);
  updateFileFields(data.entry, data, null, mappedAssetUids, matchedUids, unmatchedUids);
  assetUids = _.uniq(assetUids);
  assetUrls = _.uniq(assetUrls);
  var entry = JSON.stringify(data.entry);

  assetUrls.forEach(function (assetUrl) {
    var url = mappedAssetUrls[assetUrl];
    if (typeof url !== 'undefined') {
      entry = entry.replace(new RegExp(assetUrl, 'img'), url);
      matchedUrls.push(url);
    } else {
      unmatchedUrls.push(assetUrl);
    }
  });

  assetUids.forEach(function (assetUid) {
    var uid = mappedAssetUids[assetUid];
    if (typeof uid !== 'undefined') {
      entry = entry.replace(new RegExp(assetUid, 'img'), uid);
      matchedUids.push(assetUid);
    } else {
      unmatchedUids.push(assetUid);
    }
  });

  if (matchedUids.length) {
    var matchedAssetUids = helper.readFile(path.join(assetUidMapperPath, 'matched-asset-uids.json'));
    matchedAssetUids = matchedAssetUids || {};
    if (matchedAssetUids.hasOwnProperty(data.content_type.uid)) {
      matchedAssetUids[data.content_type.uid][data.entry.uid] = matchedUids;
    } else {
      matchedAssetUids[data.content_type.uid] = {
        [data.entry.uid]: matchedUids
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'matched-asset-uids.json'));
  }

  if (unmatchedUids.length) {
    var unmatchedAssetUids = helper.readFile(path.join(assetUidMapperPath, 'unmatched-asset-uids.json'));
    unmatchedAssetUids = unmatchedAssetUids || {};
    if (unmatchedAssetUids.hasOwnProperty(data.content_type.uid)) {
      unmatchedAssetUids[data.content_type.uid][data.entry.uid] = unmatchedUids;
    } else {
      unmatchedAssetUids[data.content_type.uid] = {
        [data.entry.uid]: unmatchedUids
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'unmatched-asset-uids.json'));
  }

  if (unmatchedUrls.length) {
    var unmatchedAssetUrls = helper.readFile(path.join(assetUidMapperPath, 'unmatched-asset-urls.json'));
    unmatchedAssetUrls = unmatchedAssetUrls || {};
    if (unmatchedAssetUrls.hasOwnProperty(data.content_type.uid)) {
      unmatchedAssetUrls[data.content_type.uid][data.entry.uid] = unmatchedUrls;
    } else {
      unmatchedAssetUrls[data.content_type.uid] = {
        [data.entry.uid]: unmatchedUrls
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'unmatched-asset-urls.json'));
  }

  if (matchedUrls.length) {
    var matchedAssetUrls = helper.readFile(path.join(assetUidMapperPath, 'matched-asset-urls.json'));
    matchedAssetUrls = matchedAssetUrls || {};
    if (matchedAssetUrls.hasOwnProperty(data.content_type.uid)) {
      matchedAssetUrls[data.content_type.uid][data.entry.uid] = matchedUrls;
    } else {
      matchedAssetUrls[data.content_type.uid] = {
        [data.entry.uid]: matchedUrls
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'matched-asset-urls.json'));
  }

  return JSON.parse(entry);
};

function findFileUrls (schema, _entry, assetUrls) {
  var markdownRegEx;
  var markdownMatch;

  // Regex to detect v2 asset uri patterns
  var _matches, regex;
  if (schema && schema.field_metadata && schema.field_metadata.markdown) {
    regex = new RegExp(
      // eslint-disable-next-line no-control-regex
      'https://(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\s\n])((.*)[\n\s]?)',
      'g');
  } else {
    regex = new RegExp(
      'https://(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^\?&\'"])(.*?)', 'g');
  }
  while ((_matches = regex.exec(_entry)) !== null) {
    if (_matches && _matches.length) {
      if (_matches[0]) {
        assetUrls.push(url.parse(_matches[0]).pathname.split('/').slice(1).join('/'));
      }
    }
  }
  var text;
  // Regex to detect v3 asset uri patterns
  if (schema && schema.field_metadata && schema.field_metadata.markdown) {
    text = marked(_entry);
  } else {
    text = JSON.stringify(_entry);
  }
  markdownRegEx = new RegExp('(https://(assets|(eu-|azure-na-|stag-)?images).contentstack.(io|com)/v3/assets/(.*?)/(.*?)/(.*?)/(.*?)(?="))', 'g');
  while ((markdownMatch = markdownRegEx.exec(text)) !== null) {
    if (markdownMatch && typeof markdownMatch[0] === 'string') {
      assetUrls.push(markdownMatch[0]);
    }
  }
}

function updateFileFields (objekt, parent, pos, mappedAssetUids, matchedUids, unmatchedUids) {
  if (_.isPlainObject(objekt) && _.has(objekt, 'filename') && _.has(objekt, 'uid')) {
    if (typeof pos !== 'undefined') {
      if (typeof pos === 'number' || typeof pos === 'string') {
        if (mappedAssetUids.hasOwnProperty(objekt.uid)) {
          parent[pos] = mappedAssetUids[objekt.uid];
          matchedUids.push(objekt.uid);
        } else {
          parent[pos] = '';
          unmatchedUids.push(objekt.uid);
        }
      }
    }
  } else if (_.isPlainObject(objekt)) {
    for (var key in objekt)
      updateFileFields(objekt[key], objekt, key, mappedAssetUids, matchedUids, unmatchedUids);
  } else if (_.isArray(objekt) && objekt.length) {
    for (var i = 0; i <= objekt.length; i++)
      updateFileFields(objekt[i], objekt, i, mappedAssetUids, matchedUids, unmatchedUids);

    parent[pos] = _.compact(objekt);
  }
}
