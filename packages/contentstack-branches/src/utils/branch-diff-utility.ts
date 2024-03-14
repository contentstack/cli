import chalk from 'chalk';
import forEach from 'lodash/forEach';
import padStart from 'lodash/padStart';
import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import unionWith from 'lodash/unionWith';
import find from 'lodash/find';
import { cliux, messageHandler, managementSDKClient } from '@contentstack/cli-utilities';
import isArray from 'lodash/isArray';
import { diff } from 'just-diff';

import {
  BranchOptions,
  BranchDiffRes,
  ModifiedFieldsInput,
  ModifiedFieldsType,
  BranchModifiedDetails,
  BranchDiffPayload,
  BranchDiffSummary,
  BranchCompactTextRes,
  BranchDiffVerboseRes,
} from '../interfaces/index';
import config from '../config';

/**
 * Fetch differences between two branches
 * @async
 * @method
 * @param payload
 * @param branchesDiffData
 * @param skip
 * @param limit
 * @returns {*} Promise<any>
 */
async function fetchBranchesDiff(
  payload: BranchDiffPayload,
  branchesDiffData = [],
  skip = config.skip,
  limit = config.limit,
): Promise<any> {
  const branchDiffData = await branchCompareSDK(payload, skip, limit);
  const diffData = branchDiffData?.diff;
  const nextUrl = branchDiffData?.next_url || '';

  if (branchesDiffData?.length) {
    branchesDiffData = [...branchesDiffData, ...diffData];
  } else {
    branchesDiffData = diffData;
  }

  if (nextUrl) {
    skip = skip + limit;
    return await fetchBranchesDiff(payload, branchesDiffData, skip, limit);
  }
  return branchesDiffData;
}

/**
 * branch compare sdk integration
 * @async
 * @method
 * @param payload
 * @param skip
 * @param limit
 * @returns  {*} Promise<any>
 */
async function branchCompareSDK(payload: BranchDiffPayload, skip?: number, limit?: number): Promise<any> {
  const { host } = payload;
  const managementAPIClient = await managementSDKClient({ host });
  const branchQuery = managementAPIClient
    .stack({ api_key: payload.apiKey })
    .branch(payload.baseBranch)
    .compare(payload.compareBranch);

  const queryParams = {};
  if (skip >= 0) queryParams['skip'] = skip;
  if (limit >= 0) queryParams['limit'] = limit;
  if (payload?.uid) queryParams['uid'] = payload.uid;
  const module = payload.module || 'all';

  switch (module) {
    case 'content_types' || 'content_type':
      return await branchQuery
        .contentTypes(queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg(err, payload.spinner));
      break;
    case 'global_fields' || 'global_field':
      return await branchQuery
        .globalFields(queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg(err, payload.spinner));
      break;
    case 'all':
      return await branchQuery
        .all(queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg(err, payload.spinner));
      break;
    default:
      handleErrorMsg({ errorMessage: 'Invalid module!' }, payload.spinner);
  }
}

function handleErrorMsg(err, spinner) {
  cliux.loaderV2('', spinner);

  if (err?.errorMessage) {
    cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
  }else if(err?.message){
    cliux.print(`Error: ${err.message}`, { color: 'red' });
  } else {
    console.log(err)
    cliux.print(`Error: ${messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
  }
  process.exit(1);
}

/**
 * filter out differences of two branches on basis of their status and return overall summary
 * @method
 * @param branchesDiffData - differences of two branches
 * @param {string} baseBranch
 * @param {string} compareBranch
 * @returns {*} BranchDiffSummary
 */
function parseSummary(branchesDiffData: any[], baseBranch: string, compareBranch: string): BranchDiffSummary {
  let baseCount: number = 0,
    compareCount: number = 0,
    modifiedCount: number = 0;

  if (branchesDiffData?.length) {
    forEach(branchesDiffData, (diff: BranchDiffRes) => {
      if (diff.status === 'compare_only') compareCount++;
      else if (diff.status === 'base_only') baseCount++;
      else if (diff.status === 'modified') modifiedCount++;
    });
  }

  const branchSummary: BranchDiffSummary = {
    base: baseBranch,
    compare: compareBranch,
    base_only: baseCount,
    compare_only: compareCount,
    modified: modifiedCount,
  };
  return branchSummary;
}

/**
 * print summary of two branches differences
 * @method
 * @param {BranchDiffSummary} diffSummary - summary of branches diff
 */
function printSummary(diffSummary: BranchDiffSummary): void {
  const totalTextLen = 12;
  forEach(diffSummary, (value, key) => {
    const str = startCase(camelCase(key));
    cliux.print(`${padStart(str, totalTextLen)}:  ${value}`);
  });
}

/**
 * filter out differences of two branches on basis of their status and return compact text details
 * @method
 * @param branchesDiffData
 * @returns {*} BranchCompactTextRes
 */
function parseCompactText(branchesDiffData: any[]): BranchCompactTextRes {
  let listOfModified: BranchDiffRes[] = [],
    listOfAdded: BranchDiffRes[] = [],
    listOfDeleted: BranchDiffRes[] = [];

  if (branchesDiffData?.length) {
    forEach(branchesDiffData, (diff: BranchDiffRes) => {
      if (diff.status === 'compare_only') listOfAdded.push(diff);
      else if (diff.status === 'base_only') listOfDeleted.push(diff);
      else if (diff.status === 'modified') listOfModified.push(diff);
    });
  }

  const branchTextRes: BranchCompactTextRes = {
    modified: listOfModified,
    added: listOfAdded,
    deleted: listOfDeleted,
  };
  return branchTextRes;
}

/**
 * print compact text details of two branches differences
 * @method
 * @param {BranchCompactTextRes} branchTextRes
 */
function printCompactTextView(branchTextRes: BranchCompactTextRes): void {
  if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
    cliux.print(' ');
    forEach(branchTextRes.added, (diff: BranchDiffRes) => {
      cliux.print(chalk.green(`+ '${diff.title}' ${startCase(camelCase(diff.type))}`));
    });

    forEach(branchTextRes.modified, (diff: BranchDiffRes) => {
      cliux.print(chalk.blue(`± '${diff.title}' ${startCase(camelCase(diff.type))}`));
    });

    forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
      cliux.print(chalk.red(`- '${diff.title}' ${startCase(camelCase(diff.type))}`));
    });
  }
}

/**
 * filter out text verbose details - deleted, added, modified details
 * @async
 * @method
 * @param branchesDiffData
 * @param {BranchDiffPayload} payload
 * @returns {*} Promise<BranchDiffVerboseRes>
 */
async function parseVerbose(branchesDiffData: any[], payload: BranchDiffPayload): Promise<BranchDiffVerboseRes> {
  const { added, modified, deleted } = parseCompactText(branchesDiffData);
  let modifiedDetailList: BranchModifiedDetails[] = [];

  for (let i = 0; i < modified?.length; i++) {
    const diff: BranchDiffRes = modified[i];
    payload.uid = diff?.uid;
    const branchDiff = await branchCompareSDK(payload);
    if (branchDiff) {
      const { listOfModifiedFields, listOfAddedFields, listOfDeletedFields } = await prepareBranchVerboseRes(
        branchDiff,
      );
      modifiedDetailList.push({
        moduleDetails: diff,
        modifiedFields: {
          modified: listOfModifiedFields,
          deleted: listOfDeletedFields,
          added: listOfAddedFields,
        },
      });
    }
  }

  const verboseRes: BranchDiffVerboseRes = {
    modified: modifiedDetailList,
    added: added,
    deleted: deleted,
  };
  return verboseRes;
}

/**
 * check whether fields exists in either base or compare branches.
 * @method
 * @param branchDiff
 * @returns
 */
async function prepareBranchVerboseRes(branchDiff: any) {
  let listOfModifiedFields = [],
    listOfDeletedFields = [],
    listOfAddedFields = [];

  if (branchDiff?.diff?.status === 'modified') {
    let unionOfBaseAndCompareBranch: any[] = [];
    const baseBranchDiff = branchDiff.diff?.base_branch?.differences;
    const compareBranchDiff = branchDiff.diff?.compare_branch?.differences;

    if (baseBranchDiff && compareBranchDiff) {
      unionOfBaseAndCompareBranch = unionWith(baseBranchDiff, compareBranchDiff, customComparator);
    }

    forEach(unionOfBaseAndCompareBranch, (diffData) => {
      const baseBranchFieldExists = find(baseBranchDiff, (item) =>
        item?.uid && diffData.uid ? item.uid === diffData.uid : item.path === diffData.path,
      );
      const compareBranchFieldExists = find(compareBranchDiff, (item) =>
        item?.uid && diffData.uid ? item.uid === diffData.uid : item.path === diffData.path,
      );
      baseAndCompareBranchDiff({
        baseBranchFieldExists,
        compareBranchFieldExists,
        diffData,
        listOfModifiedFields,
        listOfDeletedFields,
        listOfAddedFields,
      });
    });
  }

  return { listOfAddedFields, listOfDeletedFields, listOfModifiedFields };
}

/**
 * filter out the fields from the module that are deleted, added, or modified. Modules having a modified status.
 * @method
 * @param params
 */
async function baseAndCompareBranchDiff(params: {
  baseBranchFieldExists: any;
  compareBranchFieldExists: any;
  diffData: any;
  listOfModifiedFields: any[];
  listOfDeletedFields: any[];
  listOfAddedFields: any[];
}) {
  const { baseBranchFieldExists, compareBranchFieldExists, diffData } = params;
  if (baseBranchFieldExists && compareBranchFieldExists) {
    await prepareModifiedDiff(params);
  } else if (baseBranchFieldExists && !compareBranchFieldExists) {
    let displayName= baseBranchFieldExists?.display_name;
    let path = baseBranchFieldExists?.uid;
    let field = baseBranchFieldExists?.data_type;
    if(baseBranchFieldExists.path === 'description'){
      displayName = 'Description';
      path = baseBranchFieldExists?.path;
      field = 'metadata'
    }
    params.listOfDeletedFields.push({
      path: path,
      displayName:displayName,
      uid: baseBranchFieldExists?.uid,
      field: field,
    });
  } else if (!baseBranchFieldExists && compareBranchFieldExists) {
    let displayName= compareBranchFieldExists?.display_name;
    let path = compareBranchFieldExists?.uid;
    let field = compareBranchFieldExists?.data_type;
    if(compareBranchFieldExists.path === 'description'){
      displayName = 'Description';
      path = compareBranchFieldExists?.path;
      field = 'metadata'
    }
    params.listOfAddedFields.push({
      path: path,
      displayName: displayName,
      uid: compareBranchFieldExists?.uid,
      field: field,
    });
  }
}

async function prepareModifiedDiff(params: {
  baseBranchFieldExists: any;
  compareBranchFieldExists: any;
  diffData: any;
  listOfModifiedFields: any[];
  listOfDeletedFields: any[];
  listOfAddedFields: any[];
}) {
  const { baseBranchFieldExists, compareBranchFieldExists } = params;
  if (
    compareBranchFieldExists.path === 'description' ||
    compareBranchFieldExists.path === 'title' ||
    compareBranchFieldExists.path === 'options.singleton'
  ) {
    let displayName: string;
    if (baseBranchFieldExists.path === 'options.singleton') {
      if(compareBranchFieldExists.value){
        displayName = 'Single'
      }else{
        displayName = 'Multiple'
      }
    } else if (baseBranchFieldExists.path === 'description') {
      displayName = 'Description';
    } else if (baseBranchFieldExists.path === 'title') {
      displayName = 'Display Name';
    }
    params.listOfModifiedFields.push({
      path: '',
      displayName: displayName,
      uid: baseBranchFieldExists.path,
      field: 'changed',
    });
  } else {
    if (baseBranchFieldExists?.display_name && compareBranchFieldExists?.display_name) {
      const { modified, deleted, added } = await deepDiff(baseBranchFieldExists, compareBranchFieldExists);
      for (let field of Object.values(added)) {
        if (field) {
          params.listOfAddedFields.push({
            path: field['path'],
            displayName: field['displayName'],
            uid: field['uid'],
            field: field['fieldType'],
          });
        }
      }

      for (let field of Object.values(deleted)) {
        if (field) {
          params.listOfDeletedFields.push({
            path: field['path'],
            displayName: field['displayName'],
            uid: field['uid'],
            field: field['fieldType'],
          });
        }
      }

      for (let field of Object.values(modified)) {
        if (field) {
          params.listOfModifiedFields.push({
            path: field['path'],
            displayName: field['displayName'],
            uid: field['uid'],
            field: `${field['fieldType']} field`,
          });
        }
      }
    }
  }
}

function customComparator(a: any, b: any): boolean {
  return a?.uid && b?.uid ? a.uid === b.uid : a.path === b.path;
}

/**
 * print detail text view of two branches differences - deleted, added and modified fields
 * @param {BranchDiffVerboseRes} branchTextRes
 */
function printVerboseTextView(branchTextRes: BranchDiffVerboseRes): void {
  if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
    cliux.print(' ');
    forEach(branchTextRes.added, (diff: BranchDiffRes) => {
      cliux.print(chalk.green(`+ '${diff.title}' ${startCase(camelCase(diff.type))}`));
    });

    forEach(branchTextRes.modified, (diff: BranchModifiedDetails) => {
      cliux.print(chalk.blue(`± '${diff.moduleDetails.title}' ${startCase(camelCase(diff.moduleDetails.type))}`));
      printModifiedFields(diff.modifiedFields);
    });

    forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
      cliux.print(chalk.red(`- '${diff.title}' ${startCase(camelCase(diff.type))}`));
    });
  }
}

/**
 * print detail text view of modified fields
 * @method
 * @param {ModifiedFieldsInput} modfiedFields
 */
function printModifiedFields(modfiedFields: ModifiedFieldsInput): void {
  if (modfiedFields.modified?.length || modfiedFields.added?.length || modfiedFields.deleted?.length) {
    forEach(modfiedFields.modified, (diff: ModifiedFieldsType) => {
      const field: string = diff.field ? `${diff.field}` : 'field';
      const fieldDetail = diff.path ? `(${diff.path}) ${field}`: `${field}`;
      cliux.print(`   ${chalk.blue(`± "${diff.displayName}" ${fieldDetail}`)}`);
    });

    forEach(modfiedFields.added, (diff: ModifiedFieldsType) => {
      const field: string = diff.field ? `${diff.field} field` : 'field';
      cliux.print(`   ${chalk.green(`+ "${diff.displayName}" (${diff.path}) ${field}`)}`);
    });

    forEach(modfiedFields.deleted, (diff: ModifiedFieldsType) => {
      const field: string = diff.field ? `${diff.field} field` : 'field';
      cliux.print(`   ${chalk.red(`- "${diff.displayName}" (${diff.path}) ${field}`)}`);
    });
  }
}

/**
 * filter out branch differences on basis of module like content_types, global_fields
 * @param branchDiffData
 * @returns
 */
function filterBranchDiffDataByModule(branchDiffData: any[]) {
  let moduleRes = {
    content_types: [],
    global_fields: [],
  };

  forEach(branchDiffData, (item) => {
    if (item.type === 'content_type' || item.type === 'content_types') moduleRes.content_types.push(item);
    else if (item.type === 'global_field' || item.type === 'global_fields') moduleRes.global_fields.push(item);
  });
  return moduleRes;
}

const buildPath = (path, key) => (path === '' ? key : `${path}.${key}`);

async function deepDiff(baseObj, compareObj) {
  const changes = {
    modified: {},
    added: {},
    deleted: {},
  };
  function baseAndCompareSchemaDiff(baseObj, compareObj, path = '') {
    const { schema: baseSchema, path: basePath, ...restBaseObj } = baseObj;
    const { schema: compareSchema, path: comparePath, ...restCompareObj } = compareObj;
    const currentPath = buildPath(path, baseObj['uid']);
    if (restBaseObj['uid'] === restCompareObj['uid']) {
      prepareModifiedField({ restBaseObj, restCompareObj, currentPath, changes });
    }

    //case1:- base & compare schema both exists
    if (baseSchema?.length && compareSchema?.length && isArray(baseSchema) && isArray(compareSchema)) {
      const unionOfBaseAndCompareBranch = unionWith(baseSchema, compareSchema, (a, b) => a?.uid === b?.uid);
      forEach(unionOfBaseAndCompareBranch, (diffData, key) => {
        const baseBranchField = find(baseSchema, (item) => item.uid === diffData.uid);
        const compareBranchField = find(compareSchema, (item) => item.uid === diffData.uid);
        let newPath: string;
        if (baseBranchField && !compareBranchField) {
          newPath = `${currentPath}.${baseBranchField['uid']}`;
          prepareDeletedField({ path: newPath, changes, baseField: baseBranchField });
        } else if (compareBranchField && !baseBranchField) {
          newPath = `${currentPath}.${compareBranchField['uid']}`;
          prepareAddedField({ path: newPath, changes, compareField: compareBranchField });
        } else if (compareBranchField && baseBranchField) {
          baseAndCompareSchemaDiff(baseBranchField, compareBranchField, currentPath);
        }
      });
    }

    //case2:- base schema  exists only
    if (baseSchema?.length && !compareSchema?.length && isArray(baseSchema)) {
      forEach(baseSchema, (base, key) => {
        const newPath = `${currentPath}.${base['uid']}`;
        prepareDeletedField({ path: newPath, changes, baseField: base });
      });
    }
    //case3:- compare schema  exists only
    if (!baseSchema?.length && compareSchema?.length && isArray(compareSchema)) {
      forEach(compareSchema, (compare, key) => {
        const newPath = `${currentPath}.${compare['uid']}`;
        prepareAddedField({ path: newPath, changes, compareField: compare });
      });
    }
  }
  baseAndCompareSchemaDiff(baseObj, compareObj);
  return changes;
}

function prepareAddedField(params: { path: string; changes: any; compareField: any }) {
  const { path, changes, compareField } = params;
  if (!changes.added[path]) {
    const obj = {
      path: path,
      uid: compareField['uid'],
      displayName: compareField['display_name'],
      fieldType: compareField['data_type'],
    };
    changes.added[path] = obj;
  }
}

function prepareDeletedField(params: { path: string; changes: any; baseField: any }) {
  const { path, changes, baseField } = params;
  if (!changes.added[path]) {
    const obj = {
      path: path,
      uid: baseField['uid'],
      displayName: baseField['display_name'],
      fieldType: baseField['data_type'],
    };
    changes.deleted[path] = obj;
  }
}

function prepareModifiedField(params: { restBaseObj: any; restCompareObj: any; currentPath: string; changes: any }) {
  const { restBaseObj, restCompareObj, currentPath, changes } = params;
  const differences = diff(restBaseObj, restCompareObj);
  if (differences.length) {
    const modifiedField = {
      path: currentPath,
      uid: restCompareObj['uid'],
      displayName: restCompareObj['display_name'],
      fieldType: restCompareObj['data_type'],
    };
    if (!changes.modified[currentPath]) changes.modified[currentPath] = modifiedField;
  }
}

export {
  fetchBranchesDiff,
  parseSummary,
  printSummary,
  parseCompactText,
  printCompactTextView,
  parseVerbose,
  printVerboseTextView,
  filterBranchDiffDataByModule,
  branchCompareSDK,
  prepareBranchVerboseRes,
  deepDiff,
  prepareModifiedDiff,
};
