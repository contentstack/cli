/**
 * Entries lookup
 */
// FIXME refactor the complete file/code after discussed with the team

import * as path from 'path';
import * as _ from 'lodash';
import config from '../config';
import * as fileHelper from './file-helper';
import { escapeRegExp, validateRegex } from '@contentstack/cli-utilities';

import { EntryJsonRTEFieldDataType } from '../types/entries';

// update references in entry object
export const lookupEntries = function (
  data: {
    content_type: any;
    entry: any;
  },
  mappedUids: Record<string, any>,
  uidMapperPath: string,
) {
  let parent: string[] = [];
  let uids: string[] = [];
  let unmapped: string[] = [];
  let mapped: string[] = [];

  let isNewRefFields = false;
  let preserveStackVersion = config.preserveStackVersion;

  function gatherJsonRteEntryIds(jsonRteData: any) {
    jsonRteData.children?.forEach((element: any) => {
      if (element.type) {
        switch (element.type) {
          default: {
            if (element.children && element.children.length > 0) {
              gatherJsonRteEntryIds(element);
            }
            break;
          }
          case 'reference': {
            if (Object.keys(element.attrs)?.length > 0 && element.attrs?.type === 'entry') {
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

  const update = function (_parent: any, form_id: string, updateEntry: any) {
    let _entry = updateEntry;
    let len = _parent?.length;

    for (let j = 0; j < len; j++) {
      if (_entry && _parent[j]) {
        if (j === len - 1 && _entry[_parent[j]]) {
          if (form_id !== '_assets') {
            if (_entry[_parent[j]]?.length && Object.keys(_entry).includes(_parent[j])) {
              _entry[_parent[j]]?.forEach((item: any, idx: any) => {
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
              if (element.uid?.length) {
                uids.push(element.uid);
              }
            }
          } else if (_entry[_parent[j]].uid?.length) {
            uids.push(_entry[_parent[j]].uid);
          }
        } else {
          const key = _parent[j];
          if (Object.prototype.hasOwnProperty.call(_entry, key)) {
            const tempEntry = Object.create(null);
            _.merge(tempEntry, _entry);
            _entry = tempEntry[key];
            let _keys = _.clone(_parent).splice(j + 1, len);
            if (Array.isArray(_entry)) {
              for (let i = 0, _i = _entry?.length; i < _i; i++) {
                update(_keys, form_id, _entry[i]);
              }
            } else if (!(_entry instanceof Object)) {
              break;
            }
          }
        }
      }
    }
  };

  const find = function (schema: any = [], _entry: any) {
    for (let i = 0, _i = schema?.length; i < _i; i++) {
      switch (schema[i].data_type) {
        case 'reference':
          if (Array.isArray(schema[i].reference_to)) {
            isNewRefFields = true;
            schema[i]?.reference_to?.forEach((reference: any) => {
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
          for (let j = 0, _j = schema[i].blocks?.length; j < _j; j++) {
            parent.push(schema[i].uid);
            parent.push(schema[i].blocks[j].uid);
            find(schema[i].blocks[j].schema, _entry);
            parent.pop();
            parent.pop();
          }
          break;
        case 'json':
          if (schema[i]?.field_metadata?.rich_text_type) {
            findEntryIdsFromJsonRte(data.entry, data.content_type.schema);
          }
          break;
      }
    }
  };

  function findEntryIdsFromJsonRte(entry: any, ctSchema: any = []) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid]?.forEach((e: any) => {
                let key = Object.keys(e).pop();
                let subBlock = element.blocks.filter((e: any) => e.uid === key).pop();
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
              entry[element.uid]?.forEach((e: any) => {
                findEntryIdsFromJsonRte(e, element.schema);
              });
            } else {
              findEntryIdsFromJsonRte(entry[element.uid], element.schema);
            }
          }
          break;
        }
        case 'json': {
          if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
            if (element.multiple) {
              entry[element.uid]?.forEach((jsonRteData: any) => {
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
  uids?.forEach(function (uid: any) {
    if (mappedUids.hasOwnProperty(uid)) {
      const sanitizedUid = escapeRegExp(uid);
      const escapedMappedUid = escapeRegExp(mappedUids[uid]);
      const uidRegex = new RegExp(`\\b${sanitizedUid}\\b`, 'img');
      let { status } = validateRegex(uidRegex);
      if (status === 'safe') {
        entry = entry.replace(uidRegex, escapedMappedUid);
        mapped.push(uid);
      }
    } else {
      unmapped.push(uid);
    }
  });

  if (unmapped.length > 0) {
    let unmappedUids = fileHelper.readFileSync(path.join(uidMapperPath, 'unmapped-uids.json'));
    unmappedUids = unmappedUids || {};
    if (unmappedUids.hasOwnProperty(data.content_type.uid)) {
      unmappedUids[data.content_type.uid][data.entry.uid] = unmapped;
    } else {
      unmappedUids[data.content_type.uid] = {
        [data.entry.uid]: unmapped,
      };
    }
    // write the unmapped contents to ./mapper/language/unmapped-uids.json
    fileHelper.writeFile(path.join(uidMapperPath, 'unmapped-uids.json'), unmappedUids);
  }

  if (mapped.length > 0) {
    let _mappedUids = fileHelper.readFileSync(path.join(uidMapperPath, 'mapped-uids.json'));
    _mappedUids = _mappedUids || {};
    if (_mappedUids.hasOwnProperty(data.content_type.uid)) {
      _mappedUids[data.content_type.uid][data.entry.uid] = mapped;
    } else {
      _mappedUids[data.content_type.uid] = {
        [data.entry.uid]: mapped,
      };
    }
    // write the mapped contents to ./mapper/language/mapped-uids.json
    fileHelper.writeFile(path.join(uidMapperPath, 'mapped-uids.json'), _mappedUids);
  }

  return JSON.parse(entry);
};

function findUidsInNewRefFields(entry: any, uids: string[]) {
  if (entry && typeof entry === 'object') {
    if (entry.uid && entry._content_type_uid) {
      uids.push(entry.uid);
    } else if (Array.isArray(entry) && entry.length) {
      entry?.forEach(function (elem) {
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

export const removeUidsFromJsonRteFields = (
  entry: Record<string, any>,
  ctSchema: Record<string, any>[] = [],
): Record<string, any> => {
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks?.filter((block: any) => block.uid === key).pop();
              e[key] = removeUidsFromJsonRteFields(e[key], subBlock.schema);
              return e;
            });
          }
        }
        break;
      }
      case 'global_field':
      case 'group': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              e = removeUidsFromJsonRteFields(e, element.schema);
              return e;
            });
          } else {
            entry[element.uid] = removeUidsFromJsonRteFields(entry[element.uid], element.schema);
          }
        }
        break;
      }
      case 'json': {
        if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((jsonRteData: any) => {
              delete jsonRteData.uid; // remove uid

              if (_.isObject(jsonRteData.attrs)) {
                jsonRteData.attrs.dirty = true;
              }

              if (!_.isEmpty(jsonRteData.children)) {
                jsonRteData.children = _.map(jsonRteData.children, (child) => removeUidsFromChildren(child));
              }

              return jsonRteData;
            });
          } else {
            delete entry[element.uid].uid; // remove uid
            if (entry[element.uid] && _.isObject(entry[element.uid].attrs)) {
              entry[element.uid].attrs.dirty = true;
            }
            if (entry[element.uid] && !_.isEmpty(entry[element.uid].children)) {
              entry[element.uid].children = _.map(entry[element.uid].children, (child) =>
                removeUidsFromChildren(child),
              );
            }
          }
        }
        break;
      }
    }
  }
  return entry;
};

function removeUidsFromChildren(children: Record<string, any>[] | any) {
  if (children?.length && children.length > 0) {
    return children.map((child: any) => {
      if (child.type && child.type.length > 0) {
        delete child.uid; // remove uid

        if (_.isObject(child.attrs)) {
          child.attrs.dirty = true;
        }
      }
      if (child.children && child.children.length > 0) {
        child.children = removeUidsFromChildren(child.children);
      }
      return child;
    });
  } else {
    if (children.type && children.type.length > 0) {
      delete children.uid; // remove uid
      if (_.isObject(children.attrs)) {
        children.attrs.dirty = true;
      }
    }
    if (children.children && children.children.length > 0) {
      children.children = removeUidsFromChildren(children.children);
    }
    return children;
  }
}

export const removeEntryRefsFromJSONRTE = (entry: Record<string, any>, ctSchema: Record<string, any>[] = []) => {
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks?.filter((block: any) => block.uid === key).pop();
              e[key] = removeEntryRefsFromJSONRTE(e[key], subBlock.schema);
              return e;
            });
          }
        }
        break;
      }
      case 'global_field':
      case 'group': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              e = removeEntryRefsFromJSONRTE(e, element.schema);
              return e;
            });
          } else {
            entry[element.uid] = removeEntryRefsFromJSONRTE(entry[element.uid], element.schema);
          }
        }
        break;
      }
      case 'json': {
        const structuredPTag = '{"type":"p","attrs":{},"children":[{"text":""}]}';
        if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map(removeReferenceInJsonRTE);

            entry[element.uid] = entry[element.uid].map((jsonRteData: any) => {
              // repeated code from else block, will abstract later
              let entryReferences = jsonRteData.children?.filter((e: any) => doEntryReferencesExist(e));
              if (entryReferences?.length > 0) {
                jsonRteData.children = jsonRteData.children.filter((e: any) => !doEntryReferencesExist(e));
                if (jsonRteData.children.length === 0) {
                  // empty children array are no longer acceptable by the API, a default structure must be there
                  jsonRteData.children.push(JSON.parse(structuredPTag));
                }
                return jsonRteData; // return jsonRteData without entry references
              } else {
                return jsonRteData; // return jsonRteData as it is, because there are no entry references
              }
            });
          } else {
            // NOTE Clean up all the reference
            entry[element.uid] = removeReferenceInJsonRTE(entry[element.uid]);
            let entryReferences = entry[element.uid].children?.filter((e: any) => doEntryReferencesExist(e));
            if (entryReferences?.length > 0) {
              entry[element.uid].children = entry[element.uid].children.filter((e: any) => !doEntryReferencesExist(e));
              if (entry[element.uid].children?.length === 0) {
                entry[element.uid].children.push(JSON.parse(structuredPTag));
              }
            }
          }
        }
        break;
      }
      case 'text': {
        if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
          if (element.multiple) {
            let rteContent = [];
            for (let i = 0; i < entry[element.uid].length; i++) {
              rteContent.push('<p></p>');
            }
            entry[element.uid] = rteContent;
          } else {
            entry[element.uid] = '<p></p>';
          }
        }
        break;
      }
    }
  }
  return entry;
};

function doEntryReferencesExist(element: Record<string, any>[] | any): boolean {
  // checks if the children of p element contain any references
  // only checking one level deep, not recursive

  if (element?.length) {
    for (const item of element) {
      if (
        (item.type === 'p' || item.type === 'a' || item.type === 'span') &&
        item.children &&
        item.children.length > 0
      ) {
        return doEntryReferencesExist(item.children);
      } else if (isEntryRef(item)) {
        return true;
      }
    }
  } else {
    if (isEntryRef(element)) {
      return true;
    }

    if (
      (element.type === 'p' || element.type === 'a' || element.type === 'span') &&
      element.children &&
      element.children.length > 0
    ) {
      return doEntryReferencesExist(element.children);
    }
  }
  return false;
}

function isEntryRef(element: any) {
  return element.type === 'reference' && element.attrs?.type === 'entry';
}

export const restoreJsonRteEntryRefs = (
  entry: Record<string, any>,
  sourceStackEntry: any,
  ctSchema: any = [],
  { uidMapper, mappedAssetUids, mappedAssetUrls }: any,
) => {
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple && Array.isArray(entry[element.uid])) {
            entry[element.uid] = entry[element.uid].map((e: any, eIndex: number) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks?.filter((block: any) => block.uid === key).pop();
              let sourceStackElement = sourceStackEntry[element.uid][eIndex][key];
              e[key] = restoreJsonRteEntryRefs(e[key], sourceStackElement, subBlock.schema, {
                uidMapper,
                mappedAssetUids,
                mappedAssetUrls,
              });
              return e;
            });
          }
        }
        break;
      }
      case 'global_field':
      case 'group': {
        if (entry[element.uid]) {
          if (element.multiple && Array.isArray(entry[element.uid])) {
            entry[element.uid] = entry[element.uid].map((e: any, eIndex: number) => {
              let sourceStackElement = sourceStackEntry[element.uid][eIndex];
              e = restoreJsonRteEntryRefs(e, sourceStackElement, element.schema, {
                uidMapper,
                mappedAssetUids,
                mappedAssetUrls,
              });
              return e;
            });
          } else {
            let sourceStackElement = sourceStackEntry[element.uid];
            entry[element.uid] = restoreJsonRteEntryRefs(entry[element.uid], sourceStackElement, element.schema, {
              uidMapper,
              mappedAssetUids,
              mappedAssetUrls,
            });
          }
        }
        break;
      }
      case 'json': {
        if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
          if (element.multiple && Array.isArray(entry[element.uid])) {
            entry[element.uid] = sourceStackEntry[element.uid].map((jsonRTE: any) => {
              jsonRTE = restoreReferenceInJsonRTE(jsonRTE, uidMapper);
              jsonRTE.children = jsonRTE.children.map((child: any) => {
                child = setDirtyTrue(child);
                child = resolveAssetRefsInEntryRefsForJsonRte(child, mappedAssetUids, mappedAssetUrls);
                return child;
              });

              return jsonRTE;
            });
          } else {
            entry[element.uid] = restoreReferenceInJsonRTE(sourceStackEntry[element.uid], uidMapper);
            entry[element.uid].children = entry[element.uid].children.map((child: any) => {
              child = setDirtyTrue(child);
              child = resolveAssetRefsInEntryRefsForJsonRte(child, mappedAssetUids, mappedAssetUrls);
              return child;
            });
          }
        }
        break;
      }
      case 'text': {
        if (entry[element.uid] && element?.field_metadata?.rich_text_type) {
          entry[element.uid] = sourceStackEntry[element.uid];
          const matches = Object.keys(uidMapper).filter((uid) => {
            if (sourceStackEntry[element.uid].indexOf(uid) !== -1) return uid;
          });
          if (element.multiple && Array.isArray(entry[element.uid])) {
            for (let i = 0; i < matches.length; i++) {
              entry[element.uid] = entry[element.uid].map((el: string) => updateUids(el, matches[i], uidMapper));
            }
          } else {
            for (let i = 0; i < matches.length; i++) {
              entry[element.uid] = updateUids(entry[element.uid], matches[i], uidMapper);
            }
          }
        }
        break;
      }
    }
  }
  return entry;
};

function updateUids(str: string, match: string, uidMapper: Record<string, string>) {
  const sanitizedMatch = escapeRegExp(match);
  const replacement = uidMapper[match] ?? sanitizedMatch;
  return str.split(sanitizedMatch).join(replacement);
}

function setDirtyTrue(jsonRteChild: any) {
  // also removing uids in this function
  if (jsonRteChild.type) {
    if (_.isObject(jsonRteChild.attrs)) {
      jsonRteChild.attrs['dirty'] = true;
    }
    delete jsonRteChild.uid;

    if (jsonRteChild.children && jsonRteChild.children.length > 0) {
      jsonRteChild.children = jsonRteChild.children.map((subElement: any) => setDirtyTrue(subElement));
    }
  }

  return jsonRteChild;
}

function resolveAssetRefsInEntryRefsForJsonRte(jsonRteChild: any, mappedAssetUids: any, mappedAssetUrls: any) {
  if (jsonRteChild.type) {
    if (jsonRteChild.attrs?.type === 'asset') {
      let assetUrl;
      if (mappedAssetUids[jsonRteChild.attrs['asset-uid']]) {
        jsonRteChild.attrs['asset-uid'] = mappedAssetUids[jsonRteChild.attrs['asset-uid']];
      }

      if (jsonRteChild.attrs['display-type'] !== 'link') {
        assetUrl = jsonRteChild.attrs['asset-link'];
      } else {
        assetUrl = jsonRteChild.attrs['href'];
      }

      if (mappedAssetUrls[assetUrl]) {
        if (jsonRteChild.attrs['display-type'] !== 'link') {
          jsonRteChild.attrs['asset-link'] = mappedAssetUrls[assetUrl];
        } else {
          jsonRteChild.attrs['href'] = mappedAssetUrls[assetUrl];
        }
      }
    }

    if (jsonRteChild.children && jsonRteChild.children.length > 0) {
      jsonRteChild.children = jsonRteChild.children.map((subElement: any) =>
        resolveAssetRefsInEntryRefsForJsonRte(subElement, mappedAssetUids, mappedAssetUrls),
      );
    }
  }

  return jsonRteChild;
}

/**
 * The function removes references from a JSON RTE (Rich Text Editor) object.
 * @param {EntryJsonRTEFieldDataType} jsonRTE - The parameter `jsonRTE` is of type
 * `EntryJsonRTEFieldDataType`. It represents a JSON object that contains rich text content. The
 * function `removeReferenceInJsonRTE` takes this JSON object as input and removes any references
 * present in the content. It recursively traverses the JSON
 * @returns the modified `jsonRTE` object after removing any references in the JSON RTE.
 */
function removeReferenceInJsonRTE(jsonRTE: EntryJsonRTEFieldDataType): EntryJsonRTEFieldDataType {
  // NOTE Other possible reference logic will be added related to JSON RTE (Ex missing assets, extensions etc.,)
  if (jsonRTE?.children && Array.isArray(jsonRTE.children)) {
    jsonRTE.children = jsonRTE?.children?.map((child) => {
      const { children, attrs, type } = child;

      if (type === 'reference' && attrs?.['entry-uid']) {
        child = {
          type: 'p',
          attrs: {},
          children: [{ text: '' }],
        };
      }

      if (!_.isEmpty(children)) {
        return removeReferenceInJsonRTE(child);
      }

      return child;
    });
  }

  return jsonRTE;
}

/**
 * The function `restoreReferenceInJsonRTE` takes a JSON object `jsonRTE` and a mapping object
 * `uidMapper`, and recursively replaces the `entry-uid` attribute values in any `reference` type
 * elements with their corresponding values from the `uidMapper` object.
 * @param {EntryJsonRTEFieldDataType} jsonRTE - The `jsonRTE` parameter is an object that represents a
 * JSON structure. It contains a `children` property which is an array of objects. Each object
 * represents a child element in the JSON structure and can have properties like `children`, `attrs`,
 * and `type`.
 * @param uidMapper - The `uidMapper` parameter is an object that maps entry UIDs to their
 * corresponding restored UIDs. It is used to replace the `entry-uid` attribute in the JSON RTE with
 * the restored UID.
 * @returns the updated `jsonRTE` object with the restored references.
 */
function restoreReferenceInJsonRTE(
  jsonRTE: EntryJsonRTEFieldDataType,
  uidMapper: Record<string, string>,
): EntryJsonRTEFieldDataType {
  if (jsonRTE?.children && Array.isArray(jsonRTE.children)) {
    jsonRTE.children = jsonRTE?.children?.map((child, index) => {
      const { children, attrs, type } = child;

      if (type === 'reference' && attrs?.['entry-uid']) {
        jsonRTE.children[index] = child;
        jsonRTE.children[index].attrs['entry-uid'] = uidMapper[child.attrs['entry-uid']];
      }

      if (!_.isEmpty(children)) {
        return restoreReferenceInJsonRTE(child, uidMapper);
      }

      return child;
    });
  }

  return jsonRTE;
}
