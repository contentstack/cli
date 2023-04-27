"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = require("path");
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const fs_1 = require("fs");
const isEmpty_1 = tslib_1.__importDefault(require("lodash/isEmpty"));
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const base_class_1 = tslib_1.__importDefault(require("./base-class"));
const util_1 = require("../util");
class PreCheck extends base_class_1.default {
    constructor(options) {
        super(options);
        this.projectBasePath = process.cwd();
    }
    /**
     * @method run
     *
     * @param {boolean} [identifyProject=true]
     * @return {*}  {Promise<void>}
     * @memberof PreCheck
     */
    async run(identifyProject = true) {
        await this.performValidations();
        if (identifyProject && !this.config.isExistingProject) {
            await this.identifyWhatProjectItIs();
        }
    }
    /**
     * @method performValidations - Validate if the current project is an existing launch project
     *
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof PreCheck
     */
    async performValidations() {
        if (this.config.config && (0, fs_1.existsSync)(this.config.config)) {
            if (this.config.flags.init) {
                // NOTE reinitialize the project
                this.config.provider = undefined;
                this.config.isExistingProject = false;
                if (this.config.flags.type) {
                    this.config.provider = this.config.flags.type;
                }
            }
            else {
                this.validateLaunchConfig();
                this.log("Existing launch project identified", "info");
                await this.displayPreDeploymentDetails();
                if (!(await cli_utilities_1.cliux.inquire({
                    type: "confirm",
                    name: "deployLatestSource",
                    message: "Redeploy latest commit/code?",
                }))) {
                    this.exit(1);
                }
            }
        }
    }
    /**
     * @method displayPreDeploymentDetails
     *
     * @memberof GitHub
     */
    async displayPreDeploymentDetails() {
        var _a;
        if (this.config.config && !(0, isEmpty_1.default)(this.config.currentConfig)) {
            this.log(""); // Empty line
            this.log("Current Project details:", { bold: true, color: "green" });
            this.log(""); // Empty line
            const { name, projectType, repository, environments } = this.config.currentConfig;
            const [environment] = environments;
            const detail = {
                "Project Name": name,
                "Project Type": this.config.providerMapper[projectType] ||
                    "",
                Environment: environment.name,
                "Framework Preset": ((_a = (0, find_1.default)(this.config.listOfFrameWorks, {
                    value: environment.frameworkPreset,
                })) === null || _a === void 0 ? void 0 : _a.name) || "",
            };
            if (repository === null || repository === void 0 ? void 0 : repository.repositoryName) {
                detail["Repository"] = repository.repositoryName;
            }
            cli_utilities_1.cliux.table([detail, {}], {
                "Project Name": {
                    minWidth: 7,
                },
                "Project Type": {
                    minWidth: 7,
                },
                Environment: {
                    minWidth: 7,
                },
                Repository: {
                    minWidth: 7,
                },
                "Framework Preset": {
                    minWidth: 7,
                },
            });
        }
    }
    /**
     * @method validateLaunchConfig
     *
     * @memberof PreCheck
     */
    validateLaunchConfig() {
        try {
            // NOTE Perform validations here
            if ((0, isEmpty_1.default)(require(this.config.config))) {
                this.log("Invalid Launch config!", "warn");
                this.exit(1);
            }
        }
        catch (error) { }
    }
    /**
     * @method identifyWhatProjectItIs - identify if the project type (is GitHub, BitBucket, FileUpload etc.,)
     *
     * @return {*}  {Promise<void>}
     * @memberof PreCheck
     */
    async identifyWhatProjectItIs() {
        var _a;
        const localRemoteUrl = ((_a = (await (0, util_1.getRemoteUrls)((0, path_1.join)(this.config.projectBasePath, ".git/config")))) === null || _a === void 0 ? void 0 : _a.origin) || "";
        switch (true) {
            case (0, includes_1.default)(localRemoteUrl, 'github.'):
                this.config.provider = 'GitHub';
                this.log('Git project identified', 'info');
                break;
            default:
                if ((0, fs_1.existsSync)((0, path_1.join)(this.config.projectBasePath, '.git'))) {
                    this.log('Git config found but remote URL not found in the config!', {
                        color: 'yellow',
                        bold: true,
                    });
                }
                await this.connectToAdapterOnUi(false);
                break;
        }
    }
}
exports.default = PreCheck;
