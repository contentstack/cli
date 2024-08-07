import Bluebird from 'bluebird';
import * as url from 'url';
import * as path from 'path';
import { ContentstackClient, managementSDKClient, validateRegex } from '@contentstack/cli-utilities';
import { ImportConfig } from '../types';
const debug = require('debug')('util:requests');
let _ = require('lodash');
let { marked } = require('marked');
let helper = require('./file-helper');

const MAX_RETRY_LIMIT = 5;

const escapeRegExp = (str: string) => str.replace(/[*+?^${}()|[\]\\]/g, '\\$&');

function validate(req: any) {
  if (typeof req !== 'object') {
    throw new Error(`Invalid params passed for request\n${JSON.stringify(arguments)}`);
  }
}

export const uploadAssetHelper = function (config: ImportConfig, req: any, fsPath: string, RETRY?: number) {
  return new Bluebird(function (resolve, reject) {
    try {
      managementSDKClient(config)
        .then((APIClient: ContentstackClient) => {
          validate(req);
          if (typeof RETRY !== 'number') {
            RETRY = 1;
          } else if (RETRY > MAX_RETRY_LIMIT) {
            return reject(new Error('Max retry limit exceeded!'));
          }

          req.upload = fsPath;
          const stackAPIClient = APIClient.stack({
            api_key: config.target_stack,
            management_token: config.management_token,
          });
          stackAPIClient
            .asset()
            .create(req)
            .then((response) => {
              return resolve(response);
            })
            .catch((error) => {
              return reject(error);
            });
        })
        .catch(reject);
    } catch (error) {
      debug(error);
      return reject(error);
    }
  });
};

// get assets object
export const lookupAssets = function (
  data: Record<string, any>,
  mappedAssetUids: Record<string, any>,
  mappedAssetUrls: Record<string, any>,
  assetUidMapperPath: string,
  installedExtensions: Record<string, any>[],
) {
  if (
    !_.has(data, 'entry') ||
    !_.has(data, 'content_type') ||
    !_.isPlainObject(mappedAssetUids) ||
    !_.isPlainObject(mappedAssetUrls) ||
    typeof assetUidMapperPath !== 'string'
  ) {
    throw new Error('Invalid inputs for lookupAssets!');
  }
  let parent: string[] = [];
  let assetUids: string[] = [];
  let assetUrls: string[] = [];
  let unmatchedUids: string[] = [];
  let unmatchedUrls: string[] = [];
  let matchedUids: string[] = [];
  let matchedUrls: string[] = [];

  let find = function (schema: any, entryToFind: any) {
    for (let i = 0, _i = schema.length; i < _i; i++) {
      if (
        schema[i].data_type === 'text' &&
        schema[i].field_metadata &&
        (schema[i]?.field_metadata?.markdown || schema[i]?.field_metadata?.rich_text_type)
      ) {
        parent.push(schema[i].uid);
        findFileUrls(schema[i], entryToFind, assetUrls);
        if (schema[i]?.field_metadata?.rich_text_type) {
          findAssetIdsFromHtmlRte(entryToFind, schema[i]);
        }
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
      if (schema[i].data_type === 'json' && schema[i]?.field_metadata?.rich_text_type) {
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
        if (installedExtensions && installedExtensions[schema[i].extension_uid]) {
          schema[i].extension_uid = installedExtensions[schema[i].extension_uid];
        }
      }
    }
  };

  function findAssetIdsFromJsonCustomFields(entryObj: any, ctSchema: any) {
    ctSchema.map((row: any) => {
      if (row.data_type === 'json') {
        if (entryObj[row.uid] && row.field_metadata.extension && row.field_metadata.is_asset) {
          if (installedExtensions && installedExtensions[row.extension_uid]) {
            row.extension_uid = installedExtensions[row.extension_uid];
          }

          if (entryObj[row.uid].metadata && entryObj[row.uid].metadata.extension_uid) {
            if (installedExtensions && installedExtensions[entryObj[row.uid].metadata.extension_uid]) {
              entryObj[row.uid].metadata.extension_uid = installedExtensions[entryObj[row.uid].metadata.extension_uid];
            }
          }
        }
      }

      return row;
    });
  }

  function findAssetIdsFromHtmlRte(entryObj: any, ctSchema: any) {
    const regex = /<img asset_uid=\\"([^"]+)\\"/g;
    let match;
    const entry = JSON.stringify(entryObj);
    while ((match = regex.exec(entry)) !== null) {
      assetUids.push(match[1]);
    }
  }

  function findAssetIdsFromJsonRte(entryObj: any, ctSchema: any) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entryObj[element.uid]) {
            if (element.multiple) {
              entryObj[element.uid].forEach((e: any) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((block: any) => block.uid === key).pop();
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
              entryObj[element.uid].forEach((e: any) => {
                findAssetIdsFromJsonRte(e, element.schema);
              });
            } else {
              findAssetIdsFromJsonRte(entryObj[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entryObj[element.uid] && element?.field_metadata?.rich_text_type) {
            if (element.multiple) {
              entryObj[element.uid].forEach((jsonRteData: any) => {
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

  function gatherJsonRteAssetIds(jsonRteData: any) {
    jsonRteData.children.forEach((element: any) => {
      if (element.type) {
        switch (element.type) {
          default: {
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

  assetUrls.forEach(function (assetUrl: any) {
    let mappedAssetUrl = mappedAssetUrls[assetUrl];
    if (typeof mappedAssetUrl !== 'undefined') {
      entry = entry.split(assetUrl).join(mappedAssetUrl);
      matchedUrls.push(mappedAssetUrl);
    } else {
      unmatchedUrls.push(assetUrl);
    }
  });

  assetUids.forEach(function (assetUid: any) {
    let uid = mappedAssetUids[assetUid];
    if (typeof uid !== 'undefined') {
      const escapedAssetUid = assetUid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      entry = entry.split(escapedAssetUid).join(uid);
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
    if (!helper.fileExistsSync(path.join(assetUidMapperPath, 'matched-asset-uids.json'))) {
      helper.writeFile(path.join(assetUidMapperPath, 'matched-asset-uids.json'));
    }
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

function findFileUrls(schema: any, _entry: any, assetUrls: any) {
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
    '(https://(assets|(eu-|azure-na-|azure-eu-|gcp-na-)?images).contentstack.(io|com)/v3/assets/(.*?)/(.*?)/(.*?)/(.*?)(?="))',
    'g',
  );
  while ((markdownMatch = markdownRegEx.exec(text)) !== null) {
    if (markdownMatch && typeof markdownMatch[0] === 'string') {
      let assetUrl = markdownMatch[0].replace(/\\/g, '');
      assetUrls.push(assetUrl);
    }
  }
}

function updateFileFields(
  object: any,
  parent: any,
  pos: any,
  mappedAssetUids: any,
  matchedUids: any,
  unmatchedUids: any,
  mappedAssetUrls?: any,
) {
  if (_.isPlainObject(object) && _.has(object, 'filename') && _.has(object, 'uid')) {
    if (typeof pos !== 'undefined') {
      if (typeof pos === 'number' || typeof pos === 'string') {
        const replacer = () => {
          if (mappedAssetUids.hasOwnProperty(object.uid)) {
            parent[pos] = mappedAssetUids[object.uid];
            matchedUids.push(object.uid);
          } else {
            parent[pos] = '';
            unmatchedUids.push(object.uid);
          }
        };

        if (parent.uid && mappedAssetUids[parent.uid]) {
          parent.uid = mappedAssetUids[parent.uid];
        }

        if (
          object &&
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

          if (object.uid && mappedAssetUids && mappedAssetUids[object.uid]) {
            object.uid = mappedAssetUids[object.uid];
          }
          if (object.url && mappedAssetUrls && mappedAssetUrls[object.url]) {
            object.url = mappedAssetUrls[object.url];
          }
        } else {
          replacer();
        }
      }
    }
  } else if (_.isPlainObject(object)) {
    for (let key in object) updateFileFields(object[key], object, key, mappedAssetUids, matchedUids, unmatchedUids);
  } else if (_.isArray(object) && object.length) {
    for (let i = 0; i <= object.length; i++)
      updateFileFields(object[i], object, i, mappedAssetUids, matchedUids, unmatchedUids);

    // No need for _.compact() since you want to keep zero values
    parent[pos] = _.filter(object, (value: any) => value !== undefined && value !== null);
  }
}
