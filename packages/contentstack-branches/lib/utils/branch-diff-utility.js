"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareModifiedDiff = exports.deepDiff = exports.prepareBranchVerboseRes = exports.branchCompareSDK = exports.filterBranchDiffDataByModule = exports.printVerboseTextView = exports.parseVerbose = exports.printCompactTextView = exports.parseCompactText = exports.printSummary = exports.parseSummary = exports.fetchBranchesDiff = void 0;
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const forEach_1 = tslib_1.__importDefault(require("lodash/forEach"));
const padStart_1 = tslib_1.__importDefault(require("lodash/padStart"));
const startCase_1 = tslib_1.__importDefault(require("lodash/startCase"));
const camelCase_1 = tslib_1.__importDefault(require("lodash/camelCase"));
const unionWith_1 = tslib_1.__importDefault(require("lodash/unionWith"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const isArray_1 = tslib_1.__importDefault(require("lodash/isArray"));
const just_diff_1 = require("just-diff");
const config_1 = tslib_1.__importDefault(require("../config"));
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
async function fetchBranchesDiff(payload, branchesDiffData = [], skip = config_1.default.skip, limit = config_1.default.limit) {
    const branchDiffData = await branchCompareSDK(payload, skip, limit);
    const diffData = branchDiffData === null || branchDiffData === void 0 ? void 0 : branchDiffData.diff;
    const nextUrl = (branchDiffData === null || branchDiffData === void 0 ? void 0 : branchDiffData.next_url) || '';
    if (branchesDiffData === null || branchesDiffData === void 0 ? void 0 : branchesDiffData.length) {
        branchesDiffData = [...branchesDiffData, ...diffData];
    }
    else {
        branchesDiffData = diffData;
    }
    if (nextUrl) {
        skip = skip + limit;
        return await fetchBranchesDiff(payload, branchesDiffData, skip, limit);
    }
    return branchesDiffData;
}
exports.fetchBranchesDiff = fetchBranchesDiff;
/**
 * branch compare sdk integration
 * @async
 * @method
 * @param payload
 * @param skip
 * @param limit
 * @returns  {*} Promise<any>
 */
async function branchCompareSDK(payload, skip, limit) {
    const { host } = payload;
    const managementAPIClient = await (0, cli_utilities_1.managementSDKClient)({ host });
    const branchQuery = managementAPIClient
        .stack({ api_key: payload.apiKey })
        .branch(payload.baseBranch)
        .compare(payload.compareBranch);
    const queryParams = {};
    if (skip >= 0)
        queryParams['skip'] = skip;
    if (limit >= 0)
        queryParams['limit'] = limit;
    if (payload === null || payload === void 0 ? void 0 : payload.uid)
        queryParams['uid'] = payload.uid;
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
exports.branchCompareSDK = branchCompareSDK;
function handleErrorMsg(err, spinner) {
    cli_utilities_1.cliux.loaderV2('', spinner);
    if (err === null || err === void 0 ? void 0 : err.errorMessage) {
        cli_utilities_1.cliux.print(`Error: ${err.errorMessage}`, { color: 'red' });
    }
    else if (err === null || err === void 0 ? void 0 : err.message) {
        cli_utilities_1.cliux.print(`Error: ${err.message}`, { color: 'red' });
    }
    else {
        console.log(err);
        cli_utilities_1.cliux.print(`Error: ${cli_utilities_1.messageHandler.parse('CLI_BRANCH_API_FAILED')}`, { color: 'red' });
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
function parseSummary(branchesDiffData, baseBranch, compareBranch) {
    let baseCount = 0, compareCount = 0, modifiedCount = 0;
    if (branchesDiffData === null || branchesDiffData === void 0 ? void 0 : branchesDiffData.length) {
        (0, forEach_1.default)(branchesDiffData, (diff) => {
            if (diff.status === 'compare_only')
                compareCount++;
            else if (diff.status === 'base_only')
                baseCount++;
            else if (diff.status === 'modified')
                modifiedCount++;
        });
    }
    const branchSummary = {
        base: baseBranch,
        compare: compareBranch,
        base_only: baseCount,
        compare_only: compareCount,
        modified: modifiedCount,
    };
    return branchSummary;
}
exports.parseSummary = parseSummary;
/**
 * print summary of two branches differences
 * @method
 * @param {BranchDiffSummary} diffSummary - summary of branches diff
 */
function printSummary(diffSummary) {
    const totalTextLen = 12;
    (0, forEach_1.default)(diffSummary, (value, key) => {
        const str = (0, startCase_1.default)((0, camelCase_1.default)(key));
        cli_utilities_1.cliux.print(`${(0, padStart_1.default)(str, totalTextLen)}:  ${value}`);
    });
}
exports.printSummary = printSummary;
/**
 * filter out differences of two branches on basis of their status and return compact text details
 * @method
 * @param branchesDiffData
 * @returns {*} BranchCompactTextRes
 */
function parseCompactText(branchesDiffData) {
    let listOfModified = [], listOfAdded = [], listOfDeleted = [];
    if (branchesDiffData === null || branchesDiffData === void 0 ? void 0 : branchesDiffData.length) {
        (0, forEach_1.default)(branchesDiffData, (diff) => {
            if (diff.status === 'compare_only')
                listOfAdded.push(diff);
            else if (diff.status === 'base_only')
                listOfDeleted.push(diff);
            else if (diff.status === 'modified')
                listOfModified.push(diff);
        });
    }
    const branchTextRes = {
        modified: listOfModified,
        added: listOfAdded,
        deleted: listOfDeleted,
    };
    return branchTextRes;
}
exports.parseCompactText = parseCompactText;
/**
 * print compact text details of two branches differences
 * @method
 * @param {BranchCompactTextRes} branchTextRes
 */
function printCompactTextView(branchTextRes) {
    var _a, _b, _c;
    if (((_a = branchTextRes.modified) === null || _a === void 0 ? void 0 : _a.length) || ((_b = branchTextRes.added) === null || _b === void 0 ? void 0 : _b.length) || ((_c = branchTextRes.deleted) === null || _c === void 0 ? void 0 : _c.length)) {
        cli_utilities_1.cliux.print(' ');
        (0, forEach_1.default)(branchTextRes.added, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.green(`+ '${diff.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.type))}`));
        });
        (0, forEach_1.default)(branchTextRes.modified, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.blue(`± '${diff.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.type))}`));
        });
        (0, forEach_1.default)(branchTextRes.deleted, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.red(`- '${diff.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.type))}`));
        });
    }
}
exports.printCompactTextView = printCompactTextView;
/**
 * filter out text verbose details - deleted, added, modified details
 * @async
 * @method
 * @param branchesDiffData
 * @param {BranchDiffPayload} payload
 * @returns {*} Promise<BranchDiffVerboseRes>
 */
async function parseVerbose(branchesDiffData, payload) {
    const { added, modified, deleted } = parseCompactText(branchesDiffData);
    let modifiedDetailList = [];
    for (let i = 0; i < (modified === null || modified === void 0 ? void 0 : modified.length); i++) {
        const diff = modified[i];
        payload.uid = diff === null || diff === void 0 ? void 0 : diff.uid;
        const branchDiff = await branchCompareSDK(payload);
        if (branchDiff) {
            const { listOfModifiedFields, listOfAddedFields, listOfDeletedFields } = await prepareBranchVerboseRes(branchDiff);
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
    const verboseRes = {
        modified: modifiedDetailList,
        added: added,
        deleted: deleted,
    };
    return verboseRes;
}
exports.parseVerbose = parseVerbose;
/**
 * check whether fields exists in either base or compare branches.
 * @method
 * @param branchDiff
 * @returns
 */
async function prepareBranchVerboseRes(branchDiff) {
    var _a, _b, _c, _d, _e;
    let listOfModifiedFields = [], listOfDeletedFields = [], listOfAddedFields = [];
    if (((_a = branchDiff === null || branchDiff === void 0 ? void 0 : branchDiff.diff) === null || _a === void 0 ? void 0 : _a.status) === 'modified') {
        let unionOfBaseAndCompareBranch = [];
        const baseBranchDiff = (_c = (_b = branchDiff.diff) === null || _b === void 0 ? void 0 : _b.base_branch) === null || _c === void 0 ? void 0 : _c.differences;
        const compareBranchDiff = (_e = (_d = branchDiff.diff) === null || _d === void 0 ? void 0 : _d.compare_branch) === null || _e === void 0 ? void 0 : _e.differences;
        if (baseBranchDiff && compareBranchDiff) {
            unionOfBaseAndCompareBranch = (0, unionWith_1.default)(baseBranchDiff, compareBranchDiff, customComparator);
        }
        (0, forEach_1.default)(unionOfBaseAndCompareBranch, (diffData) => {
            const baseBranchFieldExists = (0, find_1.default)(baseBranchDiff, (item) => (item === null || item === void 0 ? void 0 : item.uid) && diffData.uid ? item.uid === diffData.uid : item.path === diffData.path);
            const compareBranchFieldExists = (0, find_1.default)(compareBranchDiff, (item) => (item === null || item === void 0 ? void 0 : item.uid) && diffData.uid ? item.uid === diffData.uid : item.path === diffData.path);
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
exports.prepareBranchVerboseRes = prepareBranchVerboseRes;
/**
 * filter out the fields from the module that are deleted, added, or modified. Modules having a modified status.
 * @method
 * @param params
 */
async function baseAndCompareBranchDiff(params) {
    const { baseBranchFieldExists, compareBranchFieldExists, diffData } = params;
    if (baseBranchFieldExists && compareBranchFieldExists) {
        await prepareModifiedDiff(params);
    }
    else if (baseBranchFieldExists && !compareBranchFieldExists) {
        params.listOfDeletedFields.push({
            path: baseBranchFieldExists === null || baseBranchFieldExists === void 0 ? void 0 : baseBranchFieldExists.uid,
            displayName: baseBranchFieldExists === null || baseBranchFieldExists === void 0 ? void 0 : baseBranchFieldExists.display_name,
            uid: baseBranchFieldExists === null || baseBranchFieldExists === void 0 ? void 0 : baseBranchFieldExists.uid,
            field: baseBranchFieldExists === null || baseBranchFieldExists === void 0 ? void 0 : baseBranchFieldExists.data_type,
        });
    }
    else if (!baseBranchFieldExists && compareBranchFieldExists) {
        params.listOfAddedFields.push({
            path: compareBranchFieldExists === null || compareBranchFieldExists === void 0 ? void 0 : compareBranchFieldExists.uid,
            displayName: compareBranchFieldExists === null || compareBranchFieldExists === void 0 ? void 0 : compareBranchFieldExists.display_name,
            uid: compareBranchFieldExists === null || compareBranchFieldExists === void 0 ? void 0 : compareBranchFieldExists.uid,
            field: compareBranchFieldExists === null || compareBranchFieldExists === void 0 ? void 0 : compareBranchFieldExists.data_type,
        });
    }
}
async function prepareModifiedDiff(params) {
    const { baseBranchFieldExists, compareBranchFieldExists } = params;
    if (baseBranchFieldExists.path === 'description' ||
        baseBranchFieldExists.path === 'title' ||
        baseBranchFieldExists.path === 'options.singleton') {
        let displayName;
        if (baseBranchFieldExists.path === 'options.singleton') {
            displayName = 'Single/Multiple';
        }
        else if (baseBranchFieldExists.path === 'description') {
            displayName = 'Description';
        }
        else if (baseBranchFieldExists.path === 'title') {
            displayName = 'Name';
        }
        params.listOfModifiedFields.push({
            path: baseBranchFieldExists.path,
            displayName: displayName,
            uid: baseBranchFieldExists.path,
            field: 'metadata',
        });
    }
    else {
        if ((baseBranchFieldExists === null || baseBranchFieldExists === void 0 ? void 0 : baseBranchFieldExists.display_name) && (compareBranchFieldExists === null || compareBranchFieldExists === void 0 ? void 0 : compareBranchFieldExists.display_name)) {
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
                        field: field['fieldType'],
                    });
                }
            }
        }
    }
}
exports.prepareModifiedDiff = prepareModifiedDiff;
function customComparator(a, b) {
    return (a === null || a === void 0 ? void 0 : a.uid) && (b === null || b === void 0 ? void 0 : b.uid) ? a.uid === b.uid : a.path === b.path;
}
/**
 * print detail text view of two branches differences - deleted, added and modified fields
 * @param {BranchDiffVerboseRes} branchTextRes
 */
function printVerboseTextView(branchTextRes) {
    var _a, _b, _c;
    if (((_a = branchTextRes.modified) === null || _a === void 0 ? void 0 : _a.length) || ((_b = branchTextRes.added) === null || _b === void 0 ? void 0 : _b.length) || ((_c = branchTextRes.deleted) === null || _c === void 0 ? void 0 : _c.length)) {
        cli_utilities_1.cliux.print(' ');
        (0, forEach_1.default)(branchTextRes.added, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.green(`+ '${diff.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.type))}`));
        });
        (0, forEach_1.default)(branchTextRes.modified, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.blue(`± '${diff.moduleDetails.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.moduleDetails.type))}`));
            printModifiedFields(diff.modifiedFields);
        });
        (0, forEach_1.default)(branchTextRes.deleted, (diff) => {
            cli_utilities_1.cliux.print(chalk_1.default.red(`- '${diff.title}' ${(0, startCase_1.default)((0, camelCase_1.default)(diff.type))}`));
        });
    }
}
exports.printVerboseTextView = printVerboseTextView;
/**
 * print detail text view of modified fields
 * @method
 * @param {ModifiedFieldsInput} modfiedFields
 */
function printModifiedFields(modfiedFields) {
    var _a, _b, _c;
    if (((_a = modfiedFields.modified) === null || _a === void 0 ? void 0 : _a.length) || ((_b = modfiedFields.added) === null || _b === void 0 ? void 0 : _b.length) || ((_c = modfiedFields.deleted) === null || _c === void 0 ? void 0 : _c.length)) {
        (0, forEach_1.default)(modfiedFields.added, (diff) => {
            const field = diff.field ? `${diff.field} field` : 'field';
            cli_utilities_1.cliux.print(`   ${chalk_1.default.green(`+ "${diff.displayName}" (${diff.path}) ${field}`)}`);
        });
        (0, forEach_1.default)(modfiedFields.modified, (diff) => {
            const field = diff.field ? `${diff.field} field` : 'field';
            cli_utilities_1.cliux.print(`   ${chalk_1.default.blue(`± "${diff.displayName}" (${diff.path}) ${field}`)}`);
        });
        (0, forEach_1.default)(modfiedFields.deleted, (diff) => {
            const field = diff.field ? `${diff.field} field` : 'field';
            cli_utilities_1.cliux.print(`   ${chalk_1.default.red(`- "${diff.displayName}" (${diff.path}) ${field}`)}`);
        });
    }
}
/**
 * filter out branch differences on basis of module like content_types, global_fields
 * @param branchDiffData
 * @returns
 */
function filterBranchDiffDataByModule(branchDiffData) {
    let moduleRes = {
        content_types: [],
        global_fields: [],
    };
    (0, forEach_1.default)(branchDiffData, (item) => {
        if (item.type === 'content_type' || item.type === 'content_types')
            moduleRes.content_types.push(item);
        else if (item.type === 'global_field' || item.type === 'global_fields')
            moduleRes.global_fields.push(item);
    });
    return moduleRes;
}
exports.filterBranchDiffDataByModule = filterBranchDiffDataByModule;
const buildPath = (path, key) => (path === '' ? key : `${path}.${key}`);
async function deepDiff(baseObj, compareObj) {
    const changes = {
        modified: {},
        added: {},
        deleted: {},
    };
    function baseAndCompareSchemaDiff(baseObj, compareObj, path = '') {
        const { schema: baseSchema, path: basePath } = baseObj, restBaseObj = tslib_1.__rest(baseObj, ["schema", "path"]);
        const { schema: compareSchema, path: comparePath } = compareObj, restCompareObj = tslib_1.__rest(compareObj, ["schema", "path"]);
        const currentPath = buildPath(path, baseObj['uid']);
        if (restBaseObj['uid'] === restCompareObj['uid']) {
            prepareModifiedField({ restBaseObj, restCompareObj, currentPath, changes });
        }
        //case1:- base & compare schema both exists
        if ((baseSchema === null || baseSchema === void 0 ? void 0 : baseSchema.length) && (compareSchema === null || compareSchema === void 0 ? void 0 : compareSchema.length) && (0, isArray_1.default)(baseSchema) && (0, isArray_1.default)(compareSchema)) {
            const unionOfBaseAndCompareBranch = (0, unionWith_1.default)(baseSchema, compareSchema, (a, b) => (a === null || a === void 0 ? void 0 : a.uid) === (b === null || b === void 0 ? void 0 : b.uid));
            (0, forEach_1.default)(unionOfBaseAndCompareBranch, (diffData, key) => {
                const baseBranchField = (0, find_1.default)(baseSchema, (item) => item.uid === diffData.uid);
                const compareBranchField = (0, find_1.default)(compareSchema, (item) => item.uid === diffData.uid);
                let newPath;
                if (baseBranchField && !compareBranchField) {
                    newPath = `${currentPath}.${baseBranchField['uid']}`;
                    prepareDeletedField({ path: newPath, changes, baseField: baseBranchField });
                }
                else if (compareBranchField && !baseBranchField) {
                    newPath = `${currentPath}.${compareBranchField['uid']}`;
                    prepareAddedField({ path: newPath, changes, compareField: compareBranchField });
                }
                else if (compareBranchField && baseBranchField) {
                    baseAndCompareSchemaDiff(baseBranchField, compareBranchField, currentPath);
                }
            });
        }
        //case2:- base schema  exists only
        if ((baseSchema === null || baseSchema === void 0 ? void 0 : baseSchema.length) && !(compareSchema === null || compareSchema === void 0 ? void 0 : compareSchema.length) && (0, isArray_1.default)(baseSchema)) {
            (0, forEach_1.default)(baseSchema, (base, key) => {
                const newPath = `${currentPath}.${base['uid']}`;
                prepareDeletedField({ path: newPath, changes, baseField: base });
            });
        }
        //case3:- compare schema  exists only
        if (!(baseSchema === null || baseSchema === void 0 ? void 0 : baseSchema.length) && (compareSchema === null || compareSchema === void 0 ? void 0 : compareSchema.length) && (0, isArray_1.default)(compareSchema)) {
            (0, forEach_1.default)(compareSchema, (compare, key) => {
                const newPath = `${currentPath}.${compare['uid']}`;
                prepareAddedField({ path: newPath, changes, compareField: compare });
            });
        }
    }
    baseAndCompareSchemaDiff(baseObj, compareObj);
    return changes;
}
exports.deepDiff = deepDiff;
function prepareAddedField(params) {
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
function prepareDeletedField(params) {
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
function prepareModifiedField(params) {
    const { restBaseObj, restCompareObj, currentPath, changes } = params;
    const differences = (0, just_diff_1.diff)(restBaseObj, restCompareObj);
    if (differences.length) {
        const modifiedField = {
            path: currentPath,
            uid: restCompareObj['uid'],
            displayName: restCompareObj['display_name'],
            fieldType: restCompareObj['data_type'],
        };
        if (!changes.modified[currentPath])
            changes.modified[currentPath] = modifiedField;
    }
}
