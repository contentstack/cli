import chalk from 'chalk';
import forEach from 'lodash/forEach';
import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import unionWith from 'lodash/unionWith';
import find from 'lodash/find';
import { updatedDiff } from 'deep-object-diff';
import { flatten } from 'flat';
import { cliux, messageHandler, HttpClient, configHandler } from '@contentstack/cli-utilities';
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
  const url: string = payload?.module ? `${config.baseUrl}/${payload.module}` : config.baseUrl;
  payload.url = url;
  const branchDiffData = await apiRequestHandler(payload, skip, limit);
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
        if (status === 500) errorMsg = data.message;
        else errorMsg = data.error_message;
        cliux.print(`error: ${errorMsg}`, { color: 'red' });
        cliux.loader(' ');
        process.exit(1);
      }
    })
    .catch((err) => {
      cliux.print(`error: ${messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
      cliux.loader(' ');
      process.exit(1);
    });
  return result;
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
  forEach(diffSummary, (value, key) => {
    cliux.print(`${startCase(camelCase(key))}:  ${value}`);
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
 * @param {string} module
 */
function printCompactTextView(branchTextRes: BranchCompactTextRes, module: string): void {
  if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
    forEach(branchTextRes.added, (diff: BranchDiffRes) => {
      cliux.print(`${chalk.green('+ Added:')}     '${diff.title}' ${startCase(camelCase(module))}`);
    });

    forEach(branchTextRes.modified, (diff: BranchDiffRes) => {
      cliux.print(`${chalk.blue('± Modified:')}  '${diff.title}' ${startCase(camelCase(module))}`);
    });

    forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
      cliux.print(`${chalk.red('- Deleted:')}   '${diff.title}' ${startCase(camelCase(module))}`);
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
    const url = `${config.baseUrl}/${payload.module}/${diff?.uid}`;
    payload.url = url;
    const branchDiff = await apiRequestHandler(payload);
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

    forEach(unionOfBaseAndCompareBranch, (diff) => {
      const baseBranchFieldExists = find(baseBranchDiff, (item) =>
        item?.uid && diff.uid ? item.uid === diff.uid : item.path === diff.path,
      );
      const compareBranchFieldExists = find(compareBranchDiff, (item) =>
        item?.uid && diff.uid ? item.uid === diff.uid : item.path === diff.path,
      );
      baseAndCompareBranchDiff({
        baseBranchFieldExists,
        compareBranchFieldExists,
        diff,
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
function baseAndCompareBranchDiff(params: {
  baseBranchFieldExists: any;
  compareBranchFieldExists: any;
  diff: any;
  listOfModifiedFields: any[];
  listOfDeletedFields: any[];
  listOfAddedFields: any[];
}) {
  const { baseBranchFieldExists, compareBranchFieldExists, diff } = params;
  const fieldType: string = getFieldType(compareBranchFieldExists, baseBranchFieldExists, diff);

  if (baseBranchFieldExists && compareBranchFieldExists) {
    const updated = updatedDiff(baseBranchFieldExists, compareBranchFieldExists);
    let flattenUpdatedObj: object = flatten(updated);
    forEach(flattenUpdatedObj, (value, key) => {
      if (key === 'value') {
        key = diff.path;
      }
      params.listOfModifiedFields.push({
        path: key,
        displayName: diff?.display_name,
        uid: diff?.uid,
        fieldType,
      });
    });
  } else if (baseBranchFieldExists && !compareBranchFieldExists) {
    params.listOfDeletedFields.push({
      path: baseBranchFieldExists?.path,
      displayName: diff?.display_name,
      uid: baseBranchFieldExists?.uid,
      fieldType,
    });
  } else if (!baseBranchFieldExists && compareBranchFieldExists) {
    params.listOfAddedFields.push({
      path: compareBranchFieldExists?.path,
      displayName: diff?.display_name,
      uid: compareBranchFieldExists?.uid,
      fieldType,
    });
  }
}

function customComparator(a: any, b: any): boolean {
  return a?.uid && b?.uid ? a.uid === b.uid : a.path === b.path;
}

function getFieldType(compareBranchFieldExists: any, baseBranchFieldExists: any, diff: any): string {
  let fieldType: string = 'Metadata Field';
  const displayName = compareBranchFieldExists?.display_name || baseBranchFieldExists?.display_name;
  if (displayName) {
    fieldType = `${displayName} Field`;
  }
  return fieldType;
}

/**
 * print detail text view of two branches differences - deleted, added and modified fields
 * @param {BranchDiffVerboseRes} branchTextRes
 * @param {string} module
 */
function printVerboseTextView(branchTextRes: BranchDiffVerboseRes, module: string): void {
  if (branchTextRes.modified?.length || branchTextRes.added?.length || branchTextRes.deleted?.length) {
    forEach(branchTextRes.added, (diff: BranchDiffRes) => {
      cliux.print(`${chalk.green('+ Added:')}    '${diff.title}' ${startCase(camelCase(module))}`);
    });

    forEach(branchTextRes.modified, (diff: BranchModifiedDetails) => {
      cliux.print(`${chalk.blue('± Modified:')} '${diff.moduleDetails.title}' ${startCase(camelCase(module))}`);
      printModifiedFields(diff.modifiedFields);
    });

    forEach(branchTextRes.deleted, (diff: BranchDiffRes) => {
      cliux.print(`${chalk.red('- Deleted:')}  '${diff.title}' ${startCase(camelCase(module))}`);
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
      const title: string = diff.displayName ? diff.displayName : diff.path;
      cliux.print(`   ${chalk.green('+ Added:')}     '${title}' ${startCase(camelCase(diff.fieldType))}`);
    });

    forEach(modfiedFields.modified, (diff: ModifiedFieldsType) => {
      cliux.print(`   ${chalk.blue('± Modified:')}  '${diff.path}' ${startCase(camelCase(diff.fieldType))}`);
    });

    forEach(modfiedFields.deleted, (diff: ModifiedFieldsType) => {
      const title: string = diff.displayName ? diff.displayName : diff.path;
      cliux.print(`   ${chalk.red('- Deleted:')}   '${title}' ${startCase(camelCase(diff.fieldType))}`);
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
    if (!moduleRes[item.type]) moduleRes[item.type] = [item];
    else moduleRes[item.type].push(item);
  });
  return moduleRes;
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
  apiRequestHandler,
  prepareBranchVerboseRes,
};
