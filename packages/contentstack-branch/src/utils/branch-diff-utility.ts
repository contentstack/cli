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

async function fetchBranchesDiff(
  payload: BranchDiffPayload,
  branchesDiffData = [],
  skip = 0,
  limit = 100,
): Promise<any[]> {
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
    await fetchBranchesDiff(payload, branchesDiffData, skip, limit);
  }
  return branchesDiffData;
}

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
    .then(({ data }) => data)
    .catch((err) => {
      cliux.error(messageHandler.parse('CLI_BRANCH_API_FAILED'));
      process.exit(1);
    });
  return result;
}

function parseSummary(branchesDiffData: any[], baseBranch: string, compareBranch: string) {
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

function printSummary(diffSummary: BranchDiffSummary): void {
  forEach(diffSummary, (value, key) => {
    cliux.print(`${startCase(camelCase(key))}:  ${value}`);
  });
}

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
  } else {
    cliux.print('No differences discovered.', { color: 'red' });
  }
}

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

async function prepareBranchVerboseRes(branchDiff: any) {
  let unionOfBaseAndCompareBranch: any[] = [];
  const baseBranchDiff = branchDiff?.diff?.base_branch?.differences;
  const compareBranchDiff = branchDiff?.diff?.compare_branch?.differences;

  if (baseBranchDiff && compareBranchDiff) {
    unionOfBaseAndCompareBranch = unionWith(baseBranchDiff, compareBranchDiff, customComparator);
  }

  let listOfModifiedFields = [],
    listOfDeletedFields = [],
    listOfAddedFields = [];

  if (branchDiff?.diff?.status === 'modified') {
    forEach(unionOfBaseAndCompareBranch, (diff) => {
      const baseBranchFieldExists = find(baseBranchDiff, (item) => item.uid === diff.uid || item.path === diff.path);
      const compareBranchFieldExists = find(
        compareBranchDiff,
        (item) => item.uid === diff.uid || item.path === diff.path,
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
  return a.uid === b.uid || a.path === b.path;
}

function getFieldType(compareBranchFieldExists: any, baseBranchFieldExists: any, diff: any): string {
  let fieldType: string = 'Metadata Field';
  if (diff?.field_metadata?.allow_json_rte) {
    fieldType = 'JSON RTE Field';
  } else {
    let displayName = compareBranchFieldExists?.display_name || baseBranchFieldExists?.display_name;
    if (displayName) {
      fieldType = `${displayName} Field`;
    }
  }
  return fieldType;
}

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
  } else {
    cliux.print('No differences discovered.', { color: 'red' });
  }
}

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

function filterBranchDiffDataByModule(branchDiffData: any[]) {
  let moduleRes = {};

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
};
