"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const startCase_1 = tslib_1.__importDefault(require("lodash/startCase"));
const camelCase_1 = tslib_1.__importDefault(require("lodash/camelCase"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const utils_1 = require("../utils");
const interactive_1 = require("../utils/interactive");
const branch_diff_utility_1 = require("../utils/branch-diff-utility");
class BranchDiffHandler {
    constructor(params) {
        this.options = params;
    }
    async run() {
        await this.validateMandatoryFlags();
        await this.initBranchDiffUtility();
    }
    /**
     * @methods validateMandatoryFlags - validate flags and prompt to select required flags
     * @returns {*} {Promise<void>}
     * @memberof BranchDiff
     */
    async validateMandatoryFlags() {
        let baseBranch;
        if (!this.options.stackAPIKey) {
            this.options.stackAPIKey = await (0, interactive_1.askStackAPIKey)();
        }
        if (!this.options.baseBranch) {
            baseBranch = (0, utils_1.getbranchConfig)(this.options.stackAPIKey);
            if (!baseBranch) {
                this.options.baseBranch = await (0, interactive_1.askBaseBranch)();
            }
            else {
                this.options.baseBranch = baseBranch;
            }
        }
        if (!this.options.compareBranch) {
            this.options.compareBranch = await (0, interactive_1.askCompareBranch)();
        }
        if (!this.options.module) {
            this.options.module = await (0, interactive_1.selectModule)();
        }
        if (baseBranch) {
            cli_utilities_1.cliux.print(`\nBase branch: ${baseBranch}`, { color: 'grey' });
        }
    }
    /**
     * @methods initBranchDiffUtility - call utility function to load data and display it
     * @returns {*} {Promise<void>}
     * @memberof BranchDiff
     */
    async initBranchDiffUtility() {
        const spinner = cli_utilities_1.cliux.loaderV2('Loading branch differences...');
        const payload = {
            module: '',
            apiKey: this.options.stackAPIKey,
            baseBranch: this.options.baseBranch,
            compareBranch: this.options.compareBranch,
            host: this.options.host
        };
        if (this.options.module === 'content-types') {
            payload.module = 'content_types';
        }
        else if (this.options.module === 'global-fields') {
            payload.module = 'global_fields';
        }
        payload.spinner = spinner;
        const branchDiffData = await (0, branch_diff_utility_1.fetchBranchesDiff)(payload);
        const diffData = (0, branch_diff_utility_1.filterBranchDiffDataByModule)(branchDiffData);
        cli_utilities_1.cliux.loaderV2('', spinner);
        if (this.options.module === 'all') {
            for (let module in diffData) {
                const branchDiff = diffData[module];
                payload.module = module;
                this.displaySummary(branchDiff, module);
                await this.displayBranchDiffTextAndVerbose(branchDiff, payload);
            }
        }
        else {
            const branchDiff = diffData[payload.module];
            this.displaySummary(branchDiff, this.options.module);
            await this.displayBranchDiffTextAndVerbose(branchDiff, payload);
        }
    }
    /**
     * @methods displaySummary - show branches summary on CLI
     * @returns {*} {void}
     * @memberof BranchDiff
     */
    displaySummary(branchDiffData, module) {
        cli_utilities_1.cliux.print(' ');
        cli_utilities_1.cliux.print(`${(0, startCase_1.default)((0, camelCase_1.default)(module))} Summary:`, { color: 'yellow' });
        const diffSummary = (0, branch_diff_utility_1.parseSummary)(branchDiffData, this.options.baseBranch, this.options.compareBranch);
        (0, branch_diff_utility_1.printSummary)(diffSummary);
    }
    /**
     * @methods displayBranchDiffTextAndVerbose - to show branch differences in compactText or detailText format
     * @returns {*} {void}
     * @memberof BranchDiff
     */
    async displayBranchDiffTextAndVerbose(branchDiffData, payload) {
        const spinner = cli_utilities_1.cliux.loaderV2('Loading branch differences...');
        if (this.options.format === 'compact-text') {
            const branchTextRes = (0, branch_diff_utility_1.parseCompactText)(branchDiffData);
            cli_utilities_1.cliux.loaderV2('', spinner);
            (0, branch_diff_utility_1.printCompactTextView)(branchTextRes);
        }
        else if (this.options.format === 'detailed-text') {
            const verboseRes = await (0, branch_diff_utility_1.parseVerbose)(branchDiffData, payload);
            cli_utilities_1.cliux.loaderV2('', spinner);
            (0, branch_diff_utility_1.printVerboseTextView)(verboseRes);
        }
    }
}
exports.default = BranchDiffHandler;
