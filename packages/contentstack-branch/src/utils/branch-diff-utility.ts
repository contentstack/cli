import chalk from 'chalk';
import forEach from 'lodash/forEach';
import padStart from 'lodash/padStart';
import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import unionWith from 'lodash/unionWith';
import find from 'lodash/find';
import { cliux, messageHandler, managementSDKClient, configHandler, HttpClient } from '@contentstack/cli-utilities';
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
 * api request handler
 * @async
 * @method
 * @param payload
 * @param skip
 * @param limit
 * @returns  {*} Promise<any>
 */
async function apiRequestHandler(payload: BranchDiffPayload, skip?: number, limit?: number): Promise<any> {
  const authToken = configHandler.get('authtoken');
  const headers = {
    authToken: authToken,
    api_key: payload.apiKey,
    'Content-Type': 'application/json',
  };

  const params = {
    base_branch: payload.baseBranch,
    compare_branch: payload.compareBranch,
  };
  if (skip >= 0) params['skip'] = skip;
  if (limit >= 0) params['limit'] = limit;

  const result = await new HttpClient()
    .headers(headers)
    .queryParams(params)
    .get(payload.url)
    .then(({ data, status }) => {
      if ([200, 201, 202].includes(status)) return data;
      else {
        let errorMsg: string;
        if (status === 500 && data?.message) errorMsg = data.message;
        else if (data.error_message) errorMsg = data.error_message;
        else errorMsg = messageHandler.parse('CLI_BRANCH_API_FAILED');
        cliux.loaderV2(' ', payload.spinner);
        cliux.print(`error: ${errorMsg}`, { color: 'red' });
        process.exit(1);
      }
    })
    .catch((err) => {
      cliux.loader(' ');
      cliux.print(`error: ${messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
      process.exit(1);
    });
  return result;
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
        .catch((err) => handleErrorMsg({ errorCode: err.errorCode, errorMessage: err.errorMessage }, payload.spinner));
      break;
    case 'global_fields' || 'global_field':
      return await branchQuery
        .globalFields(queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg({ errorCode: err.errorCode, errorMessage: err.errorMessage }, payload.spinner));
      break;
    case 'all':
      return await branchQuery
        .all(queryParams)
        .then((data) => data)
        .catch((err) => handleErrorMsg({ errorCode: err.errorCode, errorMessage: err.errorMessage }, payload.spinner));
      break;
    default:
      handleErrorMsg({ errorMessage: 'Invalid module!' }, payload.spinner);
  }
}

function handleErrorMsg(err: { errorCode?: number; errorMessage: string }, spinner) {
  if (err.errorMessage) {
    cliux.loaderV2('', spinner);
    cliux.print(`error: ${err.errorMessage}`, { color: 'red' });
  } else {
    cliux.print(`error: ${messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
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
    //System fields
    if (
      baseBranchFieldExists.path === 'description' ||
      baseBranchFieldExists.path === 'title' ||
      baseBranchFieldExists.path === 'options.singleton'
    ) {
      let displayName: string;
      if (baseBranchFieldExists.path === 'options.singleton') {
        displayName = 'Single/Multiple';
      } else if (baseBranchFieldExists.path === 'description') {
        displayName = 'Description';
      } else if (baseBranchFieldExists.path === 'title') {
        displayName = 'Name';
      }
      params.listOfModifiedFields.push({
        path: baseBranchFieldExists.path,
        displayName: displayName,
        uid: baseBranchFieldExists.path,
        text: 'metadata',
      });
    } else {
      if (baseBranchFieldExists?.display_name && compareBranchFieldExists?.display_name) {
        const { modified, deleted, added } = await deepDiff(baseBranchFieldExists, compareBranchFieldExists);
        for (let field of Object.values(added)) {
          params.listOfAddedFields.push({
            path: field['path'],
            displayName: field['displayName'] || 'Metadata',
            uid: field['uid'],
            text: field['text'],
          });
        }

        for (let field of Object.values(deleted)) {
          params.listOfDeletedFields.push({
            path: field['path'],
            displayName: field['displayName'] || 'Metadata',
            uid: field['uid'],
            text: field['text'],
          });
        }

        for (let field of Object.values(modified)) {
          params.listOfModifiedFields.push({
            path: field['path'],
            displayName: field['displayName'] || 'Metadata',
            uid: field['uid'],
            text: field['text'],
          });
        }
      }
    }
  } else if (baseBranchFieldExists && !compareBranchFieldExists) {
    params.listOfDeletedFields.push({
      path: baseBranchFieldExists?.uid,
      displayName: diffData?.display_name,
      uid: baseBranchFieldExists?.uid,
      text: baseBranchFieldExists?.data_type,
    });
  } else if (!baseBranchFieldExists && compareBranchFieldExists) {
    params.listOfAddedFields.push({
      path: compareBranchFieldExists?.uid,
      displayName: diffData?.display_name,
      uid: compareBranchFieldExists?.uid,
      text: baseBranchFieldExists?.data_type,
    });
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
    forEach(modfiedFields.added, (diff: ModifiedFieldsType) => {
      const title: string = diff.path ? diff.path : diff.uid;
      cliux.print(`   ${chalk.green(`+ "${diff.displayName}" (${diff.path}) ${diff.text} field`)}`);
    });

    forEach(modfiedFields.modified, (diff: ModifiedFieldsType) => {
      const title: string = diff.path ? diff.path : diff.uid;
      cliux.print(`   ${chalk.blue(`± "${diff.displayName}" (${diff.path}) ${diff.text} field`)}`);
    });

    forEach(modfiedFields.deleted, (diff: ModifiedFieldsType) => {
      const title: string = diff.path ? diff.path : diff.uid;
      cliux.print(`   ${chalk.red(`- "${diff.displayName}" (${diff.path}) ${diff.text} field`)}`);
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
  function barseAndCompareBranchDiff(baseObj, compareObj, path = '') {
    const { schema: baseSchema, path: basePath, ...restBaseObj } = baseObj;
    const { schema: compareSchema, path: comparePath, ...restCompareObj } = compareObj;
    const currentPath = buildPath(path, baseObj['uid']);
    if (restBaseObj['uid'] === restCompareObj['uid']) {
      const differences = diff(restBaseObj, restCompareObj);
      const obj = {
        path: currentPath,
        uid: restCompareObj['uid'],
        displayName: restCompareObj['display_name'],
        text: restCompareObj['data_type'],
      };
      if (differences.length) {
        if (!changes.modified[currentPath]) changes.modified[currentPath] = obj;
      }
    }

    //case1:- base & compare schema both exists
    if (baseSchema?.length && compareSchema?.length && isArray(baseSchema) && isArray(compareSchema)) {
      const unionOfBaseAndCompareBranch = unionWith(baseSchema, compareSchema, (a, b) => a.uid === b.uid);
      forEach(unionOfBaseAndCompareBranch, (diffData, key) => {
        const baseBranchField = find(baseSchema, (item) => item.uid === diffData.uid);
        const compareBranchField = find(compareSchema, (item) => item.uid === diffData.uid);
        let newPath: string;
        if (baseBranchField && !compareBranchField) {
          newPath = `${currentPath}.${baseBranchField['uid']}`;
          if (!changes.deleted[newPath]) {
            const obj = {
              path: newPath,
              uid: baseBranchField['uid'],
              displayName: baseBranchField['display_name'],
              text: baseBranchField['data_type'],
            };
            changes.deleted[newPath] = obj;
          }
        } else if (compareBranchField && !baseBranchField) {
          newPath = `${currentPath}.${compareBranchField['uid']}`;
          if (!changes.added[newPath]) {
            const obj = {
              path: newPath,
              uid: compareBranchField['uid'],
              displayName: compareBranchField['display_name'],
              text: compareBranchField['data_type'],
            };
            changes.added[newPath] = obj;
          }
        } else if (compareBranchField && baseBranchField) {
          barseAndCompareBranchDiff(baseBranchField, compareBranchField, currentPath);
        }
      });
    }

    //case2:- base schema  exists only
    if (baseSchema?.length && !compareSchema?.length && isArray(baseSchema)) {
      forEach(baseSchema, (base, key) => {
        const newPath = `${currentPath}.${base['uid']}`;
        if (!changes.deleted[newPath]) {
          const obj = { path: newPath, uid: base['uid'], displayName: base['display_name'], text: base['data_type'] };
          changes.deleted[newPath] = obj;
        }
      });
    }
    //case3:- compare schema  exists only
    if (!baseSchema?.length && compareSchema?.length && isArray(compareSchema)) {
      forEach(compareSchema, (compare, key) => {
        const newPath = `${currentPath}.${compare['uid']}`;
        if (!changes.added[newPath]) {
          const obj = {
            path: newPath,
            uid: compare['uid'],
            displayName: compare['display_name'],
            text: compare['data_type'],
          };
          changes.added[newPath] = obj;
        }
      });
    }
  }
  barseAndCompareBranchDiff(baseObj, compareObj);
  return changes;
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
};
