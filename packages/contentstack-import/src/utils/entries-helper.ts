/**
 * Entries lookup
 */

import * as path from 'path';
import * as _ from 'lodash';
import config from '../config';
import * as fileHelper from './file-helper';

// update references in entry object
export const lookupEntries = function (data: any, mappedUids: Record<string, any>, uidMapperPath: string) {
  let parent: string[] = [];
  let uids: string[] = [];
  let unmapped: string[] = [];
  let mapped: string[] = [];

  let isNewRefFields = false;
  let preserveStackVersion = config.preserveStackVersion;

  function gatherJsonRteEntryIds(jsonRteData: any) {
    jsonRteData.children.forEach((element: any) => {
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

  const update = function (_parent: any, form_id: string, updateEntry: any) {
    let _entry = updateEntry;
    let len = _parent.length;

    for (let j = 0; j < len; j++) {
      if (_entry && _parent[j]) {
        if (j === len - 1 && _entry[_parent[j]]) {
          if (form_id !== '_assets') {
            if (_entry[_parent[j]].length) {
              _entry[_parent[j]].forEach((item: any, idx: any) => {
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
  const find = function (schema: any = [], _entry: any) {
    for (let i = 0, _i = schema.length; i < _i; i++) {
      switch (schema[i].data_type) {
        case 'reference':
          if (Array.isArray(schema[i].reference_to)) {
            isNewRefFields = true;
            schema[i].reference_to.forEach((reference: any) => {
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

  function findEntryIdsFromJsonRte(entry: any, ctSchema: any) {
    for (const element of ctSchema) {
      switch (element.data_type) {
        case 'blocks': {
          if (entry[element.uid]) {
            if (element.multiple) {
              entry[element.uid].forEach((e: any) => {
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
              entry[element.uid].forEach((e: any) => {
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
              entry[element.uid].forEach((jsonRteData: any) => {
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
  uids.forEach(function (uid: any) {
    if (mappedUids.hasOwnProperty(uid)) {
      entry = entry.replace(new RegExp(uid, 'img'), mappedUids[uid]);
      mapped.push(uid);
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

export const removeUidsFromJsonRteFields = (
  entry: Record<string, any>,
  ctSchema: Record<string, any>[],
): Record<string, any> => {
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks.filter((block: any) => block.uid === key).pop();
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
        if (entry[element.uid] && element.field_metadata.rich_text_type) {
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
  if (children.length && children.length > 0) {
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

export const removeEntryRefsFromJSONRTE = (entry: Record<string, any>, ctSchema: Record<string, any>[]) => {
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks.filter((block: any) => block.uid === key).pop();
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
        if (entry[element.uid] && element.field_metadata.rich_text_type) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((jsonRteData: any) => {
              // repeated code from else block, will abstract later
              let entryReferences = jsonRteData.children.filter((e: any) => doEntryReferencesExist(e));
              if (entryReferences.length > 0) {
                jsonRteData.children = jsonRteData.children.filter((e: any) => !doEntryReferencesExist(e));
                if (jsonRteData.children.length === 0) { // empty children array are no longer acceptable by the API, a default structure must be there 
                  jsonRteData.children.push(JSON.parse(structuredPTag)); 
                }
                return jsonRteData; // return jsonRteData without entry references
              } else {
                return jsonRteData; // return jsonRteData as it is, because there are no entry references
              }
            });
          } else {
            let entryReferences = entry[element.uid].children.filter((e: any) => doEntryReferencesExist(e));
            if (entryReferences.length > 0) {
              entry[element.uid].children = entry[element.uid].children.filter((e: any) => !doEntryReferencesExist(e));
              if (entry[element.uid].children.length === 0) {
                entry[element.uid].children.push(JSON.parse(structuredPTag)); 
              }
            }
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

  if (element.length) {
    for (const item of element) {
      if ((item.type === 'p' || item.type === 'a') && item.children && item.children.length > 0) {
        return doEntryReferencesExist(item.children);
      } else if (isEntryRef(item)) {
        return true;
      }
    }
  } else {
    if (isEntryRef(element)) {
      return true;
    }

    if ((element.type === 'p' || element.type === 'a') && element.children && element.children.length > 0) {
      return doEntryReferencesExist(element.children);
    }
  }
  return false;
}

function isEntryRef(element: any) {
  return element.type === 'reference' && element.attrs.type === 'entry';
}

export const restoreJsonRteEntryRefs = (
  entry: Record<string, any>,
  sourceStackEntry: any,
  ctSchema: any,
  { mappedAssetUids, mappedAssetUrls }: any,
) => {
  // let mappedAssetUids = fileHelper.readFileSync(this.mappedAssetUidPath) || {};
  // let mappedAssetUrls = fileHelper.readFileSync(this.mappedAssetUrlPath) || {};
  for (const element of ctSchema) {
    switch (element.data_type) {
      case 'blocks': {
        if (entry[element.uid]) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any, eIndex: number) => {
              let key = Object.keys(e).pop();
              let subBlock = element.blocks.filter((block: any) => block.uid === key).pop();
              let sourceStackElement = sourceStackEntry[element.uid][eIndex][key];
              e[key] = restoreJsonRteEntryRefs(e[key], sourceStackElement, subBlock.schema, {
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
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((e: any, eIndex: number) => {
              let sourceStackElement = sourceStackEntry[element.uid][eIndex];
              e = restoreJsonRteEntryRefs(e, sourceStackElement, element.schema, { mappedAssetUids, mappedAssetUrls });
              return e;
            });
          } else {
            let sourceStackElement = sourceStackEntry[element.uid];
            entry[element.uid] = restoreJsonRteEntryRefs(entry[element.uid], sourceStackElement, element.schema, {
              mappedAssetUids,
              mappedAssetUrls,
            });
          }
        }
        break;
      }
      case 'json': {
        if (entry[element.uid] && element.field_metadata.rich_text_type) {
          if (element.multiple) {
            entry[element.uid] = entry[element.uid].map((field: any, index: number) => {
              // i am facing a Maximum call stack exceeded issue,
              // probably because of this loop operation

              let entryRefs = sourceStackEntry[element.uid][index].children
                .map((e: any, i: number) => {
                  return { index: i, value: e };
                })
                .filter((e: any) => doEntryReferencesExist(e.value))
                .map((e: any) => {
                  // commenting the line below resolved the maximum call stack exceeded issue
                  // e.value = this.setDirtyTrue(e.value)
                  setDirtyTrue(e.value);
                  return e;
                })
                .map((e: any) => {
                  // commenting the line below resolved the maximum call stack exceeded issue
                  // e.value = this.resolveAssetRefsInEntryRefsForJsonRte(e, mappedAssetUids, mappedAssetUrls)
                  resolveAssetRefsInEntryRefsForJsonRte(e.value, mappedAssetUids, mappedAssetUrls);
                  return e;
                });

              if (entryRefs.length > 0) {
                entryRefs.forEach((entryRef: any) => {
                  field.children.splice(entryRef.index, 0, entryRef.value);
                });
              }
              return field;
            });
          } else {
            let entryRefs = sourceStackEntry[element.uid].children
              .map((e: any, index: number) => {
                return { index: index, value: e };
              })
              .filter((e: any) => doEntryReferencesExist(e.value))
              .map((e: any) => {
                setDirtyTrue(e.value);
                return e;
              })
              .map((e: any) => {
                resolveAssetRefsInEntryRefsForJsonRte(e.value, mappedAssetUids, mappedAssetUrls);
                return e;
              });

            if (entryRefs.length > 0) {
              entryRefs.forEach((entryRef: any) => {
                if (!_.isEmpty(entry[element.uid]) && entry[element.uid].children) {
                  entry[element.uid].children.splice(entryRef.index, 0, entryRef.value);
                }
              });
            }
          }
        }
        break;
      }
    }
  }
  return entry;
};

function setDirtyTrue(jsonRteChild: any) {
  // also removing uids in this function
  if (jsonRteChild.type) {
    if (_.isObject(jsonRteChild.attrs)) {
      jsonRteChild.attrs['dirty'] = true;
    }
    delete jsonRteChild.uid;

    if (jsonRteChild.children && jsonRteChild.children.length > 0) {
      jsonRteChild.children = jsonRteChild.children.map((subElement: any) => this.setDirtyTrue(subElement));
    }
  }
  return jsonRteChild;
}

function resolveAssetRefsInEntryRefsForJsonRte(jsonRteChild: any, mappedAssetUids: any, mappedAssetUrls: any) {
  if (jsonRteChild.type) {
    if (jsonRteChild.attrs.type === 'asset') {
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
