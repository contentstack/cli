/*!
 * Contentstack Import
 * Copyright (c) 2019 Contentstack LLC
 * MIT Licensed
 */

let url = require('url');
let path = require('path');
let _ = require('lodash');
let { marked } = require('marked');

let helper = require('./fs');
const { getConfig } = require('./');
let config = getConfig();
const marketplaceAppPath = path.resolve(config.data, 'marketplace_apps', 'marketplace_apps.json');

// get assets object
module.exports = function (data, mappedAssetUids, mappedAssetUrls, assetUidMapperPath, installedExtensions) {
  if (
    !_.has(data, 'entry') ||
    !_.has(data, 'content_type') ||
    !_.isPlainObject(mappedAssetUids) ||
    !_.isPlainObject(mappedAssetUrls) ||
    typeof assetUidMapperPath !== 'string'
  ) {
    throw new Error('Invalid inputs for lookupAssets!');
  }
  let parent = [];
  let assetUids = [];
  let assetUrls = [];
  let unmatchedUids = [];
  let unmatchedUrls = [];
  let matchedUids = [];
  let matchedUrls = [];

  let find = function (schema, entryToFind) {
    for (let i = 0, _i = schema.length; i < _i; i++) {
      if (
        schema[i].data_type === 'text' &&
        schema[i].field_metadata &&
        (schema[i].field_metadata.markdown || schema[i].field_metadata.rich_text_type)
      ) {
        parent.push(schema[i].uid);
        findFileUrls(schema[i], entryToFind, assetUrls);
        parent.pop();
      }
      if (schema[i].data_type === 'group' || schema[i].data_type === 'global_field') {
        parent.push(schema[i].uid);
        find(schema[i].schema, entryToFind);
        parent.pop();
      }
      if (schema[i].data_type === 'blocks') {
        for (let j = 0, _j = schema[i].blocks.length; j < _j; j++) {
          if (schema[i].blocks[j].schema) {
            parent.push(schema[i].uid);
            parent.push(schema[i].blocks[j].uid);
            find(schema[i].blocks[j].schema, entryToFind);
            parent.pop();
            parent.pop();
          }
        }
      }
      // added rich_text_type field check because some marketplace extensions also
      // have data_type has json
      if (schema[i].data_type === 'json' && schema[i].field_metadata.rich_text_type) {
        parent.push(schema[i].uid);
        // findFileUrls(schema[i], entry, assetUrls)
        findAssetIdsFromJsonRte(data.entry, data.content_type.schema);
        // maybe only one of these checks would be enough
        parent.pop();
      } else if (
        schema[i].data_type === 'json' &&
        schema[i].field_metadata.extension &&
        schema[i].field_metadata.is_asset
      ) {
        findAssetIdsFromJsonCustomFields(data.entry, data.content_type.schema);
      } else if (schema[i].data_type === 'json' && schema[i].field_metadata.extension) {
        if (installedExtensions) {
          const marketplaceApps = helper.readFileSync(marketplaceAppPath);
          const oldExt = _.find(marketplaceApps, { uid: schema[i].extension_uid });

          if (oldExt) {
            const ext = _.find(installedExtensions, {
              type: oldExt.type,
              title: oldExt.title,
              app_uid: oldExt.app_uid,
            });

            if (ext) {
              schema[i].extension_uid = ext.uid;
            }
          }
        }
      }
    }
  };

  function findAssetIdsFromJsonCustomFields(entryObj, ctSchema) {
    ctSchema.map((row) => {
      if (row.data_type === 'json') {
        if (entryObj[row.uid] && row.field_metadata.extension && row.field_metadata.is_asset) {
          if (installedExtensions) {
            const marketplaceApps = helper.readFileSync(marketplaceAppPath);
            const oldExt = _.find(marketplaceApps, { uid: row.extension_uid });

            if (oldExt) {
              const ext = _.find(installedExtensions, {
                type: oldExt.type,
                title: oldExt.title,
                app_uid: oldExt.app_uid,
              });

              if (ext) {
                row.extension_uid = ext.uid;
              }
            }
          }

          if (entryObj[row.uid].metadata && entryObj[row.uid].metadata.extension_uid) {
            const marketplaceApps = helper.readFileSync(marketplaceAppPath);
            const oldExt = _.find(marketplaceApps, { uid: entryObj[row.uid].metadata.extension_uid });

            if (oldExt) {
              const ext = _.find(installedExtensions, {
                type: oldExt.type,
                title: oldExt.title,
                app_uid: oldExt.app_uid,
              });

              if (ext) {
                entryObj[row.uid].metadata.extension_uid = ext.uid;
              }
            }
          }
        }
      }

      return row;
    });
  }

  function findAssetIdsFromJsonRte(entryObj, ctSchema) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entryObj[element.uid]) {
            if (element.multiple) {
              entryObj[element.uid].forEach((e) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((block) => block.uid === key).pop();
                findAssetIdsFromJsonRte(e[key], subBlock.schema);
              });
            }
          }
          break;
        }
        case 'global_field':
        case 'group': {
          if (entryObj[element.uid]) {
            if (element.multiple) {
              entryObj[element.uid].forEach((e) => {
                findAssetIdsFromJsonRte(e, element.schema);
              });
            } else {
              findAssetIdsFromJsonRte(entryObj[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entryObj[element.uid] && element.field_metadata.rich_text_type) {
            if (element.multiple) {
              entryObj[element.uid].forEach((jsonRteData) => {
                gatherJsonRteAssetIds(jsonRteData);
              });
            } else {
              gatherJsonRteAssetIds(entryObj[element.uid]);
            }
          }
          break;
        }
      }
    }
  }

  function gatherJsonRteAssetIds(jsonRteData) {
    jsonRteData.children.forEach((element) => {
      if (element.type) {
        switch (element.type) {
          case 'a':
          case 'p': {
            if (element.children && element.children.length > 0) {
              gatherJsonRteAssetIds(element);
            }
            break;
          }
          case 'reference': {
            if (Object.keys(element.attrs).length > 0 && element.attrs.type === 'asset') {
              if (assetUids.indexOf(element.attrs['asset-uid']) === -1) {
                assetUids.push(element.attrs['asset-uid']);
              }
              // assets references inserted as link inside entry reference inserted as link did not have asset-link property
              // instead it had an 'href' property. I haven't seen 'asset-link' and 'href' together yet
              // writing this condition assuming that this never occurs, need to confirm
              // (element.attrs['asset-link']) ? assetUrls.push(element.attrs['asset-link']) : assetUrls.push(element.attrs['asset-link'])
              if (element.attrs['asset-link']) {
                if (assetUrls.indexOf(element.attrs['asset-link']) === -1) {
                  assetUrls.push(element.attrs['asset-link']);
                }
              } else if (element.attrs['href']) {
                if (assetUrls.indexOf(element.attrs['href']) === -1) {
                  assetUrls.push(element.attrs['href']);
                }
              }
            }
            if (element.children && element.children.length > 0) {
              gatherJsonRteAssetIds(element);
            }
            break;
          }
        }
      }
    });
  }

  find(data.content_type.schema, data.entry);
  updateFileFields(data.entry, data, null, mappedAssetUids, matchedUids, unmatchedUids, mappedAssetUrls);
  assetUids = _.uniq(assetUids);
  assetUrls = _.uniq(assetUrls);
  let entry = JSON.stringify(data.entry);

  assetUrls.forEach(function (assetUrl) {
    let mappedAssetUrl = mappedAssetUrls[assetUrl];
    if (typeof mappedAssetUrl !== 'undefined') {
      entry = entry.replace(new RegExp(assetUrl, 'img'), mappedAssetUrl);
      matchedUrls.push(mappedAssetUrl);
    } else {
      unmatchedUrls.push(assetUrl);
    }
  });

  assetUids.forEach(function (assetUid) {
    let uid = mappedAssetUids[assetUid];
    if (typeof uid !== 'undefined') {
      entry = entry.replace(new RegExp(assetUid, 'img'), uid);
      matchedUids.push(assetUid);
    } else {
      unmatchedUids.push(assetUid);
    }
  });

  if (matchedUids.length) {
    let matchedAssetUids = helper.readFileSync(path.join(assetUidMapperPath, 'matched-asset-uids.json'));
    matchedAssetUids = matchedAssetUids || {};
    if (matchedAssetUids.hasOwnProperty(data.content_type.uid)) {
      matchedAssetUids[data.content_type.uid][data.entry.uid] = matchedUids;
    } else {
      matchedAssetUids[data.content_type.uid] = {
        [data.entry.uid]: matchedUids,
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'matched-asset-uids.json'));
  }

  if (unmatchedUids.length) {
    let unmatchedAssetUids = helper.readFileSync(path.join(assetUidMapperPath, 'unmatched-asset-uids.json'));
    unmatchedAssetUids = unmatchedAssetUids || {};
    if (unmatchedAssetUids.hasOwnProperty(data.content_type.uid)) {
      unmatchedAssetUids[data.content_type.uid][data.entry.uid] = unmatchedUids;
    } else {
      unmatchedAssetUids[data.content_type.uid] = {
        [data.entry.uid]: unmatchedUids,
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'unmatched-asset-uids.json'));
  }

  if (unmatchedUrls.length) {
    let unmatchedAssetUrls = helper.readFileSync(path.join(assetUidMapperPath, 'unmatched-asset-urls.json'));
    unmatchedAssetUrls = unmatchedAssetUrls || {};
    if (unmatchedAssetUrls.hasOwnProperty(data.content_type.uid)) {
      unmatchedAssetUrls[data.content_type.uid][data.entry.uid] = unmatchedUrls;
    } else {
      unmatchedAssetUrls[data.content_type.uid] = {
        [data.entry.uid]: unmatchedUrls,
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'unmatched-asset-urls.json'));
  }

  if (matchedUrls.length) {
    let matchedAssetUrls = helper.readFileSync(path.join(assetUidMapperPath, 'matched-asset-urls.json'));
    matchedAssetUrls = matchedAssetUrls || {};
    if (matchedAssetUrls.hasOwnProperty(data.content_type.uid)) {
      matchedAssetUrls[data.content_type.uid][data.entry.uid] = matchedUrls;
    } else {
      matchedAssetUrls[data.content_type.uid] = {
        [data.entry.uid]: matchedUrls,
      };
    }
    helper.writeFile(path.join(assetUidMapperPath, 'matched-asset-urls.json'));
  }

  return JSON.parse(entry);
};

function findFileUrls(schema, _entry, assetUrls) {
  let markdownRegEx;
  let markdownMatch;

  // Regex to detect v2 asset uri patterns
  let _matches, regex;
  if (schema && schema.field_metadata && schema.field_metadata.markdown) {
    regex = new RegExp(
      // eslint-disable-next-line no-control-regex
      'https://(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^?&s\n])((.*)[\ns]?)',
      'g',
    );
  } else {
    regex = new RegExp(
      'https://(contentstack-|)api.(built|contentstack).io/(.*?)/download(.*?)uid=([a-z0-9]+[^?&\'"])(.*?)',
      'g',
    );
  }
  while ((_matches = regex.exec(_entry)) !== null) {
    if (_matches && _matches.length) {
      if (_matches[0]) {
        assetUrls.push(url.parse(_matches[0]).pathname.split('/').slice(1).join('/'));
      }
    }
  }
  let text;
  // Regex to detect v3 asset uri patterns
  if (schema && schema.field_metadata && schema.field_metadata.markdown) {
    text = marked(JSON.stringify(_entry));
  } else {
    text = JSON.stringify(_entry);
  }
  markdownRegEx = new RegExp(
    '(https://(assets|(eu-|azure-na-)?images).contentstack.(io|com)/v3/assets/(.*?)/(.*?)/(.*?)/(.*?)(?="))',
    'g',
  );
  while ((markdownMatch = markdownRegEx.exec(text)) !== null) {
    if (markdownMatch && typeof markdownMatch[0] === 'string') {
      assetUrls.push(markdownMatch[0]);
    }
  }
}

function updateFileFields(objekt, parent, pos, mappedAssetUids, matchedUids, unmatchedUids, mappedAssetUrls) {
  if (_.isPlainObject(objekt) && _.has(objekt, 'filename') && _.has(objekt, 'uid')) {
    if (typeof pos !== 'undefined') {
      if (typeof pos === 'number' || typeof pos === 'string') {
        const replacer = () => {
          if (mappedAssetUids.hasOwnProperty(objekt.uid)) {
            parent[pos] = mappedAssetUids[objekt.uid];
            matchedUids.push(objekt.uid);
          } else {
            parent[pos] = '';
            unmatchedUids.push(objekt.uid);
          }
        };

        if (parent.uid && mappedAssetUids[parent.uid]) {
          parent.uid = mappedAssetUids[parent.uid];
        }

        if (
          objekt &&
          _.isObject(parent[pos]) &&
          parent[pos].uid &&
          parent[pos].url &&
          _.has(parent, 'asset') &&
          _.has(parent, '_content_type_uid') &&
          parent._content_type_uid === 'sys_assets'
        ) {
          if (
            _.has(parent, 'asset') &&
            _.has(parent, '_content_type_uid') &&
            parent._content_type_uid === 'sys_assets'
          ) {
            parent = _.omit(parent, ['asset']);
          }

          if (objekt.uid && mappedAssetUids && mappedAssetUids[objekt.uid]) {
            objekt.uid = mappedAssetUids[objekt.uid];
          }
          if (objekt.url && mappedAssetUrls && mappedAssetUrls[objekt.url]) {
            objekt.url = mappedAssetUrls[objekt.url];
          }
        } else {
          replacer();
        }
      }
    }
  } else if (_.isPlainObject(objekt)) {
    for (let key in objekt) updateFileFields(objekt[key], objekt, key, mappedAssetUids, matchedUids, unmatchedUids);
  } else if (_.isArray(objekt) && objekt.length) {
    for (let i = 0; i <= objekt.length; i++)
      updateFileFields(objekt[i], objekt, i, mappedAssetUids, matchedUids, unmatchedUids);

    parent[pos] = _.compact(objekt);
  }
}
