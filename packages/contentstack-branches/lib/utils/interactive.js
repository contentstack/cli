"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.askBranchNameConfirmation = exports.selectCustomPreferences = exports.askMergeComment = exports.askExportMergeSummaryPath = exports.selectMergeExecution = exports.selectMergeStrategySubOptions = exports.selectMergeStrategy = exports.inquireRequireFieldValidation = exports.askConfirmation = exports.askBranchUid = exports.askSourceBranch = exports.askBaseBranch = exports.askStackAPIKey = exports.askCompareBranch = exports.selectModule = void 0;
const tslib_1 = require("tslib");
const isEmpty_1 = tslib_1.__importDefault(require("lodash/isEmpty"));
const startCase_1 = tslib_1.__importDefault(require("lodash/startCase"));
const camelCase_1 = tslib_1.__importDefault(require("lodash/camelCase"));
const forEach_1 = tslib_1.__importDefault(require("lodash/forEach"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
async function selectModule() {
    return await cli_utilities_1.cliux.inquire({
        type: 'list',
        name: 'module',
        message: 'CLI_BRANCH_MODULE',
        choices: [
            { name: 'Content Types', value: 'content-types' },
            { name: 'Global Fields', value: 'global-fields' },
            { name: 'All', value: 'all' },
        ],
        validate: inquireRequireFieldValidation,
    });
}
exports.selectModule = selectModule;
async function askCompareBranch() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_COMPARE_BRANCH',
        name: 'compare_branch',
        validate: inquireRequireFieldValidation,
    });
}
exports.askCompareBranch = askCompareBranch;
async function askStackAPIKey() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_STACK_API_KEY',
        name: 'api_key',
        validate: inquireRequireFieldValidation,
    });
}
exports.askStackAPIKey = askStackAPIKey;
async function askBaseBranch() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_BASE_BRANCH',
        name: 'branch_branch',
        validate: inquireRequireFieldValidation,
    });
}
exports.askBaseBranch = askBaseBranch;
async function askSourceBranch() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_SOURCE_BRANCH',
        name: 'source_branch',
        validate: inquireRequireFieldValidation,
    });
}
exports.askSourceBranch = askSourceBranch;
async function askBranchUid() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_BRANCH_UID',
        name: 'branch_uid',
        validate: inquireRequireFieldValidation,
    });
}
exports.askBranchUid = askBranchUid;
async function askConfirmation() {
    const resp = await cli_utilities_1.cliux.inquire({
        type: 'confirm',
        message: 'Are you sure you want to delete this branch?',
        name: 'confirm',
    });
    return resp;
}
exports.askConfirmation = askConfirmation;
function inquireRequireFieldValidation(input) {
    if ((0, isEmpty_1.default)(input)) {
        return cli_utilities_1.messageHandler.parse('CLI_BRANCH_REQUIRED_FIELD');
    }
    return true;
}
exports.inquireRequireFieldValidation = inquireRequireFieldValidation;
async function selectMergeStrategy() {
    const strategy = await cli_utilities_1.cliux
        .inquire({
        type: 'list',
        name: 'module',
        choices: [
            { name: 'Merge, Prefer Base', value: 'merge_prefer_base' },
            { name: 'Merge, Prefer Compare', value: 'merge_prefer_compare' },
            { name: 'Merge, Ask for Preference', value: 'custom_preferences' },
            { name: 'Overwrite with Compare', value: 'overwrite_with_compare' },
        ],
        message: 'What merge strategy would you like to choose? <doc link>',
    })
        .then((name) => name)
        .catch((err) => {
        cli_utilities_1.cliux.error('Failed to collect the merge strategy');
        process.exit(1);
    });
    return strategy;
}
exports.selectMergeStrategy = selectMergeStrategy;
async function selectMergeStrategySubOptions() {
    const strategy = await cli_utilities_1.cliux
        .inquire({
        type: 'list',
        name: 'module',
        choices: [
            { name: 'New in Compare Only', value: 'new' },
            { name: 'Modified Only', value: 'modified' },
            { name: 'Both', value: 'both' },
            { name: 'Go Back', value: 'previous' },
            { name: 'Start Over', value: 'restart' },
        ],
        message: 'What do you want to merge?',
    })
        .then((name) => name)
        .catch((err) => {
        cli_utilities_1.cliux.error('Failed to collect the merge strategy');
        process.exit(1);
    });
    return strategy;
}
exports.selectMergeStrategySubOptions = selectMergeStrategySubOptions;
async function selectMergeExecution() {
    const strategy = await cli_utilities_1.cliux
        .inquire({
        type: 'list',
        name: 'module',
        choices: [
            { name: 'Execute Merge', value: 'both' },
            { name: 'Export Merge Summary', value: 'export' },
            { name: 'Go Back', value: 'previous' },
            { name: 'Start Over', value: 'restart' },
        ],
        message: 'What would you like to do?',
    })
        .then((name) => name)
        .catch((err) => {
        cli_utilities_1.cliux.error('Exiting the merge process...');
        process.exit(1);
    });
    return strategy;
}
exports.selectMergeExecution = selectMergeExecution;
async function askExportMergeSummaryPath() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'Enter the file path to export the summary',
        name: 'filePath',
        validate: inquireRequireFieldValidation,
    });
}
exports.askExportMergeSummaryPath = askExportMergeSummaryPath;
async function askMergeComment() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'Enter a comment for merge',
        name: 'comment',
        validate: inquireRequireFieldValidation,
    });
}
exports.askMergeComment = askMergeComment;
async function selectCustomPreferences(module, payload) {
    // cliux.print(`\n Select from ${startCase(camelCase(module))}`, { color: 'yellow' });
    var _a, _b, _c;
    // parse rows
    const tableRows = [];
    if (((_a = payload.modified) === null || _a === void 0 ? void 0 : _a.length) || ((_b = payload.added) === null || _b === void 0 ? void 0 : _b.length) || ((_c = payload.deleted) === null || _c === void 0 ? void 0 : _c.length)) {
        (0, forEach_1.default)(payload.added, (item) => {
            const row = {};
            row.name = `+ ${item.title}`;
            row.status = 'added';
            row.value = item;
            tableRows.push(row);
        });
        (0, forEach_1.default)(payload.modified, (item) => {
            const row = {};
            row.name = `± ${item.title}`;
            row.status = 'modified';
            row.value = item;
            tableRows.push(row);
        });
        (0, forEach_1.default)(payload.deleted, (item) => {
            const row = {};
            row.name = `- ${item.title}`;
            row.status = 'deleted';
            row.value = item;
            tableRows.push(row);
        });
    }
    else {
        return;
    }
    const selectedStrategies = await cli_utilities_1.cliux.inquire({
        type: 'table',
        message: `Select the ${(0, startCase_1.default)((0, camelCase_1.default)(module))} changes for merge`,
        name: 'mergeContentTypePreferences',
        selectAll: true,
        pageSize: 10,
        columns: [
            {
                name: 'Merge Prefer Base',
                value: 'merge_prefer_base',
            },
            {
                name: 'Merge Prefer Compare',
                value: 'merge_prefer_compare',
            },
            {
                name: 'Overwrite(Use Compare)',
                value: 'overwrite_with_compare',
            },
            {
                name: 'Ignore(Use Base)',
                value: 'ignore',
            },
        ],
        rows: tableRows,
    });
    let updatedArray = [];
    (0, forEach_1.default)(selectedStrategies, (strategy, index) => {
        const selectedItem = tableRows[index];
        if (strategy && selectedItem) {
            delete selectedItem.value.status;
            selectedItem.value.merge_strategy = strategy;
            updatedArray.push(selectedItem);
        }
    });
    return updatedArray; // selected items
}
exports.selectCustomPreferences = selectCustomPreferences;
async function askBranchNameConfirmation() {
    return await cli_utilities_1.cliux.inquire({
        type: 'input',
        message: 'CLI_BRANCH_NAME_CONFIRMATION',
        name: 'branch_name',
        validate: inquireRequireFieldValidation,
    });
}
exports.askBranchNameConfirmation = askBranchNameConfirmation;
