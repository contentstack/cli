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
        findFileUrls(parent, schema[i], entry, assetUrls);
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
    }
  };
  
  
  find(data.content_type.schema, data.entry);
  updateFileFields(data.entry, data, null, mappedAssetUids, matchedUids, unmatchedUids);
  assetUids = _.uniq(assetUids);
  assetUrls = _.uniq(assetUrls);
  var entry = JSON.stringify(data.entry);
  assetUids.forEach(function (assetUid) {
    var uid = mappedAssetUids[assetUid];
    if (typeof uid !== 'undefined') {
      entry = entry.replace(new RegExp(assetUid, 'img'), uid);
      matchedUids.push(assetUid);
    } else {
      unmatchedUids.push(assetUid);
    }
  });

  assetUrls.forEach(function (assetUrl) {
    var url = mappedAssetUrls[assetUrl];
    if (typeof url !== 'undefined') {
      entry = entry.replace(new RegExp(assetUrl, 'img'), url);
      unmatchedUrls.push(url);
    } else {
      unmatchedUrls.push(assetUrl);
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
    text = _entry;
  }
  markdownRegEx = new RegExp('(https://(assets|images).contentstack.io/v3/assets/(.*?)/(.*?)/(.*?)/(.*)(?="))', 'g');
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
