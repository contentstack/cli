"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = require("path");
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const omit_1 = tslib_1.__importDefault(require("lodash/omit"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const split_1 = tslib_1.__importDefault(require("lodash/split"));
const child_process_1 = require("child_process");
const replace_1 = tslib_1.__importDefault(require("lodash/replace"));
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const util_1 = require("../util");
const base_class_1 = tslib_1.__importDefault(require("./base-class"));
const create_git_meta_1 = require("../util/create-git-meta");
const graphql_1 = require("../graphql");
class GitHub extends base_class_1.default {
    constructor(options) {
        super(options);
    }
    /**
     * @method run - initialization function
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    async run() {
        // NOTE New project creation Flow
        if (this.config.isExistingProject) {
            await this.initApolloClient();
            await this.createNewDeployment();
        }
        else {
            // NOTE Existing project flow
            // NOTE Step 1: Check is Github connected
            if (await this.checkGitHubConnected()) {
                // NOTE Step 2: check is the git remote available in the user's repo list
                if (await this.checkGitRemoteAvailableAndValid()) {
                    if (await this.checkUserGitHubAccess()) {
                        // NOTE Step 3: check is the user has proper git access
                        await this.prepareForNewProjectCreation();
                    }
                }
            }
            await this.createNewProject();
        }
        this.prepareLaunchConfig();
        await this.showLogs();
        this.showDeploymentUrl();
        this.showSuggestion();
    }
    /**
     * @method createNewProject - Create new launch project
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    async createNewProject() {
        const { branch, provider, framework, repository, projectName, buildCommand, selectedStack, outputDirectory, environmentName, } = this.config;
        const username = (0, split_1.default)(repository === null || repository === void 0 ? void 0 : repository.fullName, "/")[0];
        await this.apolloClient
            .mutate({
            mutation: graphql_1.importProjectMutation,
            variables: {
                project: {
                    name: projectName,
                    cmsStackApiKey: selectedStack === null || selectedStack === void 0 ? void 0 : selectedStack.api_key,
                    repository: {
                        username,
                        gitProvider: provider,
                        repositoryUrl: repository === null || repository === void 0 ? void 0 : repository.url,
                        repositoryName: repository === null || repository === void 0 ? void 0 : repository.fullName,
                    },
                    environment: {
                        gitBranch: branch,
                        frameworkPreset: framework,
                        outputDirectory: outputDirectory,
                        name: environmentName || "Default",
                        buildCommand: buildCommand || "npm run build",
                        environmentVariables: (0, map_1.default)(this.envVariables, ({ key, value }) => ({ key, value })),
                    },
                },
            },
        })
            .then(({ data: { project } }) => {
            this.log("New project created successfully", "info");
            const [firstEnvironment] = project.environments;
            this.config.currentConfig = project;
            this.config.currentConfig.deployments = (0, map_1.default)(firstEnvironment.deployments.edges, "node");
            this.config.currentConfig.environments[0] = (0, omit_1.default)(this.config.currentConfig.environments[0], ["deployments"]);
        })
            .catch(async (error) => {
            const canRetry = await this.handleNewProjectCreationError(error);
            if (canRetry) {
                return this.createNewProject();
            }
        });
    }
    /**
     * @method prepareForNewProjectCreation - Preparing all the data for new project creation
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async prepareForNewProjectCreation() {
        var _a, _b, _c;
        const { name, framework, environment, "build-command": buildCommand, "output-directory": outputDirectory, } = this.config.flags;
        await this.selectOrg();
        (0, util_1.print)([
            { message: "?", color: "green" },
            { message: "Repository", bold: true },
            { message: (_a = this.config.repository) === null || _a === void 0 ? void 0 : _a.fullName, color: "cyan" },
        ]);
        await this.selectBranch();
        this.config.projectName =
            name ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    name: "projectName",
                    message: "Project Name",
                    default: (_b = this.config.repository) === null || _b === void 0 ? void 0 : _b.name,
                    validate: this.inquireRequireValidation,
                }));
        this.config.environmentName =
            environment ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    default: "Default",
                    name: "environmentName",
                    message: "Environment Name",
                    validate: this.inquireRequireValidation,
                }));
        if (framework) {
            this.config.framework = (0, find_1.default)(this.config.listOfFrameWorks, {
                name: framework,
            }).value;
            (0, util_1.print)([
                { message: "?", color: "green" },
                { message: "Framework Preset", bold: true },
                { message: this.config.framework, color: "cyan" },
            ]);
        }
        else {
            await this.detectFramework();
        }
        this.config.buildCommand =
            buildCommand ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    default: "npm run build",
                    name: "buildCommand",
                    message: "Build Command",
                    validate: this.inquireRequireValidation,
                }));
        this.config.outputDirectory =
            outputDirectory ||
                (await cli_utilities_1.cliux.inquire({
                    type: "input",
                    name: "outputDirectory",
                    message: "Output Directory",
                    default: this.config.outputDirectories[((_c = this.config) === null || _c === void 0 ? void 0 : _c.framework) || "OTHER"],
                }));
        await this.handleEnvImportFlow();
    }
    /**
     * @method checkGitHubConnected - GitHub connection validation
     *
     * @return {*}  {(Promise<{
     *     userUid: string;
     *     provider: string;
     *   } | void>)}
     * @memberof GitHub
     */
    async checkGitHubConnected() {
        const userConnections = await this.apolloClient
            .query({ query: graphql_1.userConnectionsQuery })
            .then(({ data: { userConnections } }) => userConnections)
            .catch((error) => this.log(error, "error"));
        const userConnection = (0, find_1.default)(userConnections, {
            provider: this.config.provider,
        });
        if (userConnection) {
            this.log("GitHub connection identified!", "info");
            this.config.userConnection = userConnection;
        }
        else {
            this.log("GitHub connection not found!", "warn");
            await this.connectToAdapterOnUi();
        }
        return this.config.userConnection;
    }
    /**
     * @method checkGitRemoteAvailableAndValid - GitHub repository verification
     *
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof GitHub
     */
    async checkGitRemoteAvailableAndValid() {
        var _a;
        const localRemoteUrl = ((_a = (await (0, create_git_meta_1.getRemoteUrls)((0, path_1.join)(this.config.projectBasePath, ".git/config")))) === null || _a === void 0 ? void 0 : _a.origin) || "";
        if (!localRemoteUrl) {
            this.log("GitHub project not identified!", "error");
            await this.connectToAdapterOnUi();
        }
        const repositories = await this.apolloClient
            .query({ query: graphql_1.repositoriesQuery })
            .then(({ data: { repositories } }) => repositories)
            .catch((error) => this.log(error, "error"));
        this.config.repository = (0, find_1.default)(repositories, {
            url: (0, replace_1.default)(localRemoteUrl, ".git", ""),
        });
        if (!this.config.repository) {
            this.log("Repository not found in the list!", "error");
            this.exit(1);
        }
        return true;
    }
    /**
     * @method checkUserGitHubAccess - GitHub user access validation
     *
     * @return {*}  {Promise<boolean>}
     * @memberof GitHub
     */
    async checkUserGitHubAccess() {
        return new Promise((resolve, reject) => {
            var _a;
            const self = this;
            const defaultBranch = (_a = this.config.repository) === null || _a === void 0 ? void 0 : _a.defaultBranch;
            if (!defaultBranch)
                return reject("Branch not found");
            (0, child_process_1.exec)(`git push -u origin ${defaultBranch} --dry-run`, { cwd: this.config.projectBasePath }, function (err, stdout, stderr) {
                if (err) {
                    self.log(err, "error");
                }
                if ((0, includes_1.default)(stderr, "Everything up-to-date") &&
                    (0, includes_1.default)(stdout, `Would set upstream of '${defaultBranch}' to '${defaultBranch}' of 'origin'`)) {
                    self.log("User access verified", "info");
                    return resolve(true);
                }
                self.log("You do not have write access for the selected repo", "error");
                self.exit(0);
            });
        });
    }
}
exports.default = GitHub;
