"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const open_1 = tslib_1.__importDefault(require("open"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const keys_1 = tslib_1.__importDefault(require("lodash/keys"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const last_1 = tslib_1.__importDefault(require("lodash/last"));
const merge_1 = tslib_1.__importDefault(require("lodash/merge"));
const first_1 = tslib_1.__importDefault(require("lodash/first"));
const split_1 = tslib_1.__importDefault(require("lodash/split"));
const filter_1 = tslib_1.__importDefault(require("lodash/filter"));
const replace_1 = tslib_1.__importDefault(require("lodash/replace"));
const forEach_1 = tslib_1.__importDefault(require("lodash/forEach"));
const isEmpty_1 = tslib_1.__importDefault(require("lodash/isEmpty"));
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const cloneDeep_1 = tslib_1.__importDefault(require("lodash/cloneDeep"));
const fs_1 = require("fs");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const config_1 = tslib_1.__importDefault(require("../config"));
const util_1 = require("../util");
const graphql_1 = require("../graphql");
class BaseClass {
    constructor(options) {
        this.projectCreationRetryCount = 0;
        this.envVariables = [];
        const { log, exit, config, $event, apolloClient, managementSdk, analyticsInfo, apolloLogsClient, } = options;
        this.config = config;
        this.$event = $event;
        this.log = log || console.log;
        this.apolloClient = apolloClient;
        this.analyticsInfo = analyticsInfo;
        this.managementSdk = managementSdk;
        this.apolloLogsClient = apolloLogsClient;
        this.exit = exit || ((code = 0) => process.exit(code));
    }
    /**
     * @method initApolloClient - initialize Apollo client
     *
     * @memberof BaseClass
     */
    async initApolloClient() {
        this.apolloClient = await new util_1.GraphqlApiClient({
            headers: {
                "x-cs-cli": this.analyticsInfo,
                "x-project-uid": this.config.currentConfig.uid,
                organization_uid: this.config.currentConfig.organizationUid,
            },
            baseUrl: this.config.manageApiBaseUrl,
        }).apolloClient;
    }
    /**
     * @method createNewDeployment - Create new deployment on existing launch project
     *
     * @return {*}  {Promise<void>}
     * @memberof GitHub
     */
    async createNewDeployment(skipGitData = false, uploadUid) {
        var _a;
        const deployment = {
            environment: (_a = (0, first_1.default)(this.config.currentConfig.environments)) === null || _a === void 0 ? void 0 : _a.uid,
        };
        if (uploadUid) {
            deployment.uploadUid = uploadUid;
        }
        await this.apolloClient
            .mutate({
            mutation: graphql_1.createDeploymentMutation,
            variables: { deployment, skipGitData },
        })
            .then(({ data: { deployment } }) => {
            this.log("Deployment process started.!", "info");
            this.config.currentConfig.deployments.push(deployment);
        })
            .catch((error) => {
            this.log("Deployment process failed.!", "error");
            this.log(error, "error");
            this.exit(1);
        });
    }
    /**
     * @method selectOrg - select organization
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async selectOrg() {
        var _a;
        const organizations = (await ((_a = this.managementSdk) === null || _a === void 0 ? void 0 : _a.organization().fetchAll().then(({ items }) => (0, map_1.default)(items, ({ uid, name }) => ({ name, value: name, uid }))).catch((error) => {
            this.log("Unable to fetch organizations.", "warn");
            this.log(error, "error");
            this.exit(1);
        }))) || [];
        if (this.config.flags.org &&
            (0, find_1.default)(organizations, { uid: this.config.flags.org })) {
            this.config.currentConfig.organizationUid = this.config.flags.org;
        }
        else {
            if (this.config.flags.org) {
                this.log("Organization UID not found!", "error");
            }
            this.config.currentConfig.organizationUid = await cli_utilities_1.cliux
                .inquire({
                type: "search-list",
                name: "Organization",
                choices: organizations,
                message: "Choose an organization",
            })
                .then((name) => { var _a; return (_a = (0, find_1.default)(organizations, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        }
        // NOTE re initialize apollo client once org selected
        await this.initApolloClient();
    }
    /**
     * @method selectProjectType - select project type/provider/adapter
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async selectProjectType() {
        const choices = [
            ...(0, map_1.default)(config_1.default.supportedAdapters, (provider) => ({
                value: provider,
                name: `Continue with ${provider}`,
            })),
            { value: "FileUpload", name: "Continue with FileUpload" },
        ];
        const selectedProvider = await cli_utilities_1.cliux.inquire({
            choices: choices,
            type: "search-list",
            name: "projectType",
            message: "Choose a project type to proceed",
        });
        this.config.provider = selectedProvider;
    }
    /**
     *  @method detectFramework - detect the project framework
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async detectFramework() {
        var _a;
        const { fullName, defaultBranch } = this.config.repository || {};
        const query = this.config.provider === "FileUpload"
            ? graphql_1.fileFrameworkQuery
            : graphql_1.frameworkQuery;
        const variables = this.config.provider === "FileUpload"
            ? {
                query: { uploadUid: this.config.uploadUid },
            }
            : {
                query: {
                    provider: this.config.provider,
                    repoName: fullName,
                    branchName: defaultBranch,
                },
            };
        this.config.framework = (await this.apolloClient
            .query({ query, variables })
            .then(({ data: { framework: { framework }, }, }) => framework)
            .catch((error) => {
            this.log("Something went wrong. Please try again.", "warn");
            this.log(error, "error");
            this.exit(1);
        })) || {
            envVariables: undefined,
        };
        this.config.framework = await cli_utilities_1.cliux.inquire({
            type: "search-list",
            name: "frameworkPreset",
            message: "Framework Preset",
            default: this.config.framework,
            choices: [
                {
                    name: (_a = (0, find_1.default)(this.config.listOfFrameWorks, ({ value }) => value === this.config.framework)) === null || _a === void 0 ? void 0 : _a.name,
                    value: this.config.framework,
                },
                ...(0, filter_1.default)(this.config.listOfFrameWorks, ({ value }) => value !== this.config.framework),
            ],
        });
    }
    /**
     *  @method getCmsEnvironmentVariables - get list of environment variables
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async getCmsEnvironmentVariables() {
        this.envVariables = (await this.apolloClient
            .query({ query: graphql_1.cmsEnvironmentVariablesQuery })
            .then(({ data: { envVariables } }) => envVariables)
            .catch((error) => this.log(error, "error"))) || {
            envVariables: undefined,
        };
    }
    /**
     * @method selectStack - Select stack to import variables, tokens
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async selectStack() {
        var _a;
        const listOfStacks = (await ((_a = this.managementSdk) === null || _a === void 0 ? void 0 : _a.stack().query({ organization_uid: this.config.currentConfig.organizationUid }).find().then(({ items }) => (0, map_1.default)(items, ({ name, api_key }) => ({ name, value: name, api_key }))).catch((error) => {
            this.log("Unable to fetch stacks.!", { color: "yellow" });
            this.log(error, "error");
            this.exit(1);
        }))) || [];
        this.config.selectedStack = await cli_utilities_1.cliux
            .inquire({
            name: "stack",
            type: "search-list",
            choices: listOfStacks,
            message: "Stack",
        })
            .then((name) => (0, find_1.default)(listOfStacks, { name }));
    }
    /**
     * @method selectDeliveryToken - Select delivery token from a stack
     *
     * @return {*}  {Promise<any>}
     * @memberof BaseClass
     */
    async selectDeliveryToken() {
        var _a, _b, _c;
        const listOfDeliveryTokens = (await ((_a = this.managementSdk) === null || _a === void 0 ? void 0 : _a.stack({ api_key: this.config.selectedStack.api_key }).deliveryToken().query().find().then(({ items }) => (0, map_1.default)(items, ({ name, token, scope }) => ({
            name,
            token,
            scope,
            value: name,
        }))).catch((error) => {
            this.log("Unable to fetch the delivery token!", "warn");
            this.log(error, "error");
            this.exit(1);
        }))) || [];
        this.config.deliveryToken = await cli_utilities_1.cliux
            .inquire({
            type: "search-list",
            name: "deliveryToken",
            choices: listOfDeliveryTokens,
            message: "Delivery token",
        })
            .then((name) => (0, find_1.default)(listOfDeliveryTokens, { name }));
        this.config.environment =
            (_c = (_b = this.config.deliveryToken.scope[0]) === null || _b === void 0 ? void 0 : _b.environments[0]) === null || _c === void 0 ? void 0 : _c.name;
    }
    /**
     * @method promptForEnvValues - Prompt and get manual entry of environment variables
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async promptForEnvValues() {
        let addNew = true;
        const envVariables = [];
        do {
            const variable = await cli_utilities_1.cliux
                .inquire({
                type: "input",
                name: "variable",
                message: "Enter key and value with a colon between them, and use a comma(,) for the key-value pair. Format: <key1>:<value1>, <key2>:<value2> Ex: APP_ENV:prod, TEST_ENV:testVal",
            })
                .then((variable) => {
                return (0, map_1.default)((0, split_1.default)(variable, ","), (variable) => {
                    let [key, value] = (0, split_1.default)(variable, ":");
                    value = (value || "").trim();
                    key = (key || "").trim();
                    return { key, value };
                }).filter(({ key }) => key);
            });
            envVariables.push(...variable);
            if (!(await cli_utilities_1.cliux.inquire({
                type: "confirm",
                name: "canImportFromStack",
                message: "Would you like to add more variables?",
            }))) {
                addNew = false;
            }
        } while (addNew);
        this.envVariables.push(...envVariables);
    }
    /**
     * @method prepareLaunchConfig - prepare and write launch config in to dist.
     *
     * @memberof BaseClass
     */
    prepareLaunchConfig() {
        let data = {};
        if (this.config.config && (0, fs_1.existsSync)(this.config.config)) {
            data = require(this.config.config);
        }
        if (this.config.branch) {
            data[this.config.branch] = this.config.currentConfig;
        }
        else {
            data.project = this.config.currentConfig;
        }
        (0, fs_1.writeFileSync)(`${this.config.projectBasePath}/${this.config.configName}`, JSON.stringify(data), { encoding: "utf8", flag: "w" });
    }
    /**
     * @method connectToAdapterOnUi - Open browser to connect with adapter with launch (GitHub etc.,)
     *
     * @param {boolean} [emit=true]
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async connectToAdapterOnUi(emit = true) {
        await this.selectProjectType();
        if ((0, includes_1.default)(this.config.supportedAdapters, this.config.provider)) {
            const baseUrl = this.config.host.startsWith("http")
                ? this.config.host
                : `https://${this.config.host}`;
            const gitHubConnectUrl = `${baseUrl
                .replace("api", "app")
                .replace("io", "com")}/#!/launch`;
            this.log(`You can connect your ${this.config.provider} account to the UI using the following URL:`, "info");
            this.log(gitHubConnectUrl, { color: "green" });
            (0, open_1.default)(gitHubConnectUrl);
            this.exit(1);
        }
        else if (emit) {
            this.$event.emit("provider-changed");
        }
    }
    /**
     * @method queryBranches - Query all paginated branches
     *
     * @param {Record<string, any>} variables
     * @param {any[]} [branchesRes=[]]
     * @return {*}  {Promise<any[]>}
     * @memberof BaseClass
     */
    async queryBranches(variables, branchesRes = []) {
        const branches = await this.apolloClient
            .query({
            query: graphql_1.branchesQuery,
            variables,
        })
            .then(({ data: { branches } }) => branches)
            .catch((error) => {
            this.log("Something went wrong. Please try again.", "warn");
            this.log(error, "error");
            this.exit(1);
        });
        if (branches) {
            branchesRes.push(...(0, map_1.default)(branches.edges, "node"));
            if (branches.pageInfo.hasNextPage) {
                variables.page = branches.pageData.page + 1;
                return await this.queryBranches(variables, branchesRes);
            }
        }
        return branchesRes;
    }
    /**
     * @method selectBranch - Select a branch for launch process
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async selectBranch() {
        var _a, _b;
        const variables = {
            page: 1,
            first: 100,
            query: {
                provider: this.config.provider,
                repoName: (_a = this.config.repository) === null || _a === void 0 ? void 0 : _a.fullName,
            },
        };
        const branches = await this.queryBranches(variables);
        if (branches &&
            this.config.flags.branch &&
            (0, find_1.default)(branches, { name: this.config.flags.branch })) {
            this.config.branch = this.config.flags.branch;
        }
        else {
            if (this.config.flags.branch) {
                this.log("Branch name not found!", "warn");
            }
            this.config.branch = await cli_utilities_1.cliux.inquire({
                name: "branch",
                message: "Branch",
                type: "search-list",
                choices: (0, map_1.default)(branches, "name"),
                default: (_b = this.config.repository) === null || _b === void 0 ? void 0 : _b.defaultBranch,
            });
        }
    }
    /**
     * @method inquireRequireValidation - Required validation for prompt
     *
     * @param {*} input
     * @return {*}  {(string | boolean)}
     * @memberof BaseClass
     */
    inquireRequireValidation(input) {
        if ((0, isEmpty_1.default)(input)) {
            return "This field can't be empty.";
        }
        return true;
    }
    /**
     * @method handleEnvImportFlow - Manage variables flow whether to import or manual input.
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async handleEnvImportFlow() {
        const variablePreparationTypeOptions = [
            "Import variables from a stack",
            "Manually add custom variables to the list",
            "Import variables from the local env file",
        ];
        const variablePreparationType = await cli_utilities_1.cliux.inquire({
            type: "checkbox",
            name: "variablePreparationType",
            default: this.config.framework,
            choices: variablePreparationTypeOptions,
            message: "Import variables from a stack and/or manually add custom variables to the list",
            validate: this.inquireRequireValidation,
        });
        if ((0, includes_1.default)(variablePreparationType, "Import variables from a stack")) {
            await this.importEnvFromStack();
        }
        if ((0, includes_1.default)(variablePreparationType, "Manually add custom variables to the list")) {
            await this.promptForEnvValues();
        }
        if ((0, includes_1.default)(variablePreparationType, "Import variables from the local env file")) {
            await this.importVariableFromLocalConfig();
        }
        if (this.envVariables.length) {
            this.printAllVariables();
        }
        else {
            this.log("Import variables from a stack and/or manually add custom variables to the list", "warn");
            this.exit(1);
        }
    }
    /**
     * @method importVariableFromLocalConfig - Import environment variable from local config
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async importVariableFromLocalConfig() {
        const localEnv = dotenv_1.default.config({
            path: this.config.projectBasePath,
        }).parsed ||
            dotenv_1.default.config({
                path: `${this.config.projectBasePath}/.env.local`,
            }).parsed;
        if (!(0, isEmpty_1.default)(localEnv)) {
            let envKeys = (0, keys_1.default)(localEnv);
            const existingEnvKeys = (0, map_1.default)(this.envVariables, "key");
            const localEnvData = (0, map_1.default)(envKeys, (key) => ({
                key,
                value: localEnv[key],
            }));
            if ((0, find_1.default)(existingEnvKeys, (key) => (0, includes_1.default)(envKeys, key))) {
                this.log("Duplicate environment variable keys found.", "warn");
                if (await cli_utilities_1.cliux.inquire({
                    default: false,
                    type: "confirm",
                    name: "deployLatestSource",
                    message: "Would you like to keep the local environment variables?",
                })) {
                    this.envVariables = (0, merge_1.default)(this.envVariables, localEnvData);
                }
                else {
                    this.envVariables = (0, merge_1.default)(localEnvData, this.envVariables);
                }
            }
            else {
                this.envVariables.push(...localEnvData);
            }
        }
    }
    /**
     * @method importEnvFromStack - Import environment variables from stack
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseClass
     */
    async importEnvFromStack() {
        await this.selectStack();
        await this.selectDeliveryToken();
        (0, util_1.print)([
            { message: "?", color: "green" },
            { message: "Stack Environment", bold: true },
            { message: this.config.environment || "", color: "cyan" },
        ]);
        await this.getCmsEnvironmentVariables();
        this.envVariables = (0, map_1.default)((0, cloneDeep_1.default)(this.envVariables), (variable) => {
            var _a;
            switch (variable.key) {
                case "CONTENTSTACK_API_HOST":
                case "CONTENTSTACK_CDN":
                    if (variable.value.startsWith("http")) {
                        const url = new URL(variable.value);
                        variable.value = (url === null || url === void 0 ? void 0 : url.host) || this.config.host;
                    }
                    break;
                case "CONTENTSTACK_ENVIRONMENT":
                    variable.value = this.config.environment;
                    break;
                case "CONTENTSTACK_API_KEY":
                    variable.value = this.config.selectedStack.api_key;
                    break;
                case "CONTENTSTACK_DELIVERY_TOKEN":
                    variable.value = (_a = this.config.deliveryToken) === null || _a === void 0 ? void 0 : _a.token;
                    break;
            }
            return variable;
        });
    }
    /**
     * @method printAllVariables - Print/Display all variables on ui
     *
     * @memberof BaseClass
     */
    printAllVariables() {
        cli_utilities_1.cliux.table([
            ...(this.config.flags['show-variables']
                ? this.envVariables
                : this.envVariables.map(({ key, value }) => ({
                    key,
                    value: (0, replace_1.default)(value, /./g, '*'),
                }))),
            { key: '', value: '' },
        ], {
            key: {
                minWidth: 7,
            },
            value: {
                minWidth: 7,
            },
        });
    }
    /**
     * @method showLogs - show deployment logs on terminal/UI
     *
     * @return {*}  {Promise<boolean>}
     * @memberof BaseClass
     */
    async showLogs() {
        var _a, _b;
        this.apolloLogsClient = await new util_1.GraphqlApiClient({
            headers: {
                "x-cs-cli": this.analyticsInfo,
                "x-project-uid": this.config.currentConfig.uid,
                organization_uid: this.config.currentConfig.organizationUid,
            },
            baseUrl: this.config.logsApiBaseUrl,
        }).apolloClient;
        this.apolloClient = await new util_1.GraphqlApiClient({
            headers: {
                "x-cs-cli": this.analyticsInfo,
                "x-project-uid": this.config.currentConfig.uid,
                organization_uid: this.config.currentConfig.organizationUid,
            },
            baseUrl: this.config.manageApiBaseUrl,
        }).apolloClient;
        this.config.environment = (_a = (0, last_1.default)(this.config.currentConfig.environments)) === null || _a === void 0 ? void 0 : _a.uid;
        this.config.deployment = (_b = (0, last_1.default)(this.config.currentConfig.deployments)) === null || _b === void 0 ? void 0 : _b.uid;
        const logs = new util_1.LogPolling({
            config: this.config,
            $event: this.$event,
            apolloManageClient: this.apolloClient,
            apolloLogsClient: this.apolloLogsClient,
        });
        logs.deploymentLogs();
        return new Promise((resolve) => {
            this.$event.on("deployment-logs", (event) => {
                const { message, msgType } = event;
                if (message === "DONE")
                    return resolve(true);
                if (msgType === "info") {
                    (0, forEach_1.default)(message, (log) => {
                        var _a, _b;
                        let formattedLogTimestamp = (_b = (_a = new Date(log.timestamp)
                            .toISOString()) === null || _a === void 0 ? void 0 : _a.slice(0, 23)) === null || _b === void 0 ? void 0 : _b.replace("T", " ");
                        this.log(`${formattedLogTimestamp}:  ${log.message}`, msgType);
                    });
                }
                else if (msgType === "error") {
                    this.log(message, msgType);
                    resolve(true);
                }
            });
        });
    }
    /**
     * @method handleNewProjectCreationError
     *
     * @param {*} error
     * @return {*}  {(Promise<boolean | void>)}
     * @memberof BaseClass
     */
    async handleNewProjectCreationError(error) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        this.log("New project creation failed!", "error");
        if ((0, includes_1.default)((_d = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.graphQLErrors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.extensions) === null || _c === void 0 ? void 0 : _c.exception) === null || _d === void 0 ? void 0 : _d.messages, "launch.PROJECTS.DUPLICATE_NAME")) {
            this.log("Duplicate project name identified", "error");
            if (this.projectCreationRetryCount >=
                this.config.projectCreationRetryMaxCount) {
                this.log("Reached max project creation retry limit", "warn");
            }
            else if (await cli_utilities_1.cliux.inquire({
                type: "confirm",
                name: "deployLatestSource",
                message: "Would you like to change the project's name and try again?",
            })) {
                this.config.projectName = await cli_utilities_1.cliux.inquire({
                    type: "input",
                    name: "projectName",
                    message: "Project Name",
                    default: (_e = this.config.repository) === null || _e === void 0 ? void 0 : _e.name,
                    validate: this.inquireRequireValidation,
                });
                this.projectCreationRetryCount++;
                return true;
            }
        }
        else if ((0, includes_1.default)((_j = (_h = (_g = (_f = error === null || error === void 0 ? void 0 : error.graphQLErrors) === null || _f === void 0 ? void 0 : _f[0]) === null || _g === void 0 ? void 0 : _g.extensions) === null || _h === void 0 ? void 0 : _h.exception) === null || _j === void 0 ? void 0 : _j.messages, "launch.PROJECTS.LIMIT_REACHED")) {
            this.log("Launch project limit reached!", "error");
        }
        else {
            this.log(error, "error");
        }
        this.exit(1);
    }
    /**
     * @method showDeploymentUrl - show deployment URL and open it on browser
     *
     * @param {boolean} [openOnUi=true]
     * @memberof BaseClass
     */
    showDeploymentUrl(openOnUi = true) {
        const deployment = (0, last_1.default)(this.config.currentConfig.deployments);
        if (deployment) {
            const deploymentUrl = deployment.deploymentUrl.startsWith("https")
                ? deployment.deploymentUrl
                : `https://${deployment.deploymentUrl}`;
            (0, util_1.print)([
                { message: "Deployment URL", bold: true },
                { message: deploymentUrl, color: "cyan" },
            ]);
            if (openOnUi) {
                // NOTE delaying to open the deployment url. If we open quickly it's showing site not reachable
                setTimeout(() => {
                    (0, open_1.default)(deploymentUrl);
                }, 6000);
            }
        }
    }
    /**
     * @method showSuggestion - Show suggestion to add config file to .gitignore
     *
     * @return {*}
     * @memberof GitHub
     */
    showSuggestion() {
        const gitIgnoreFilePath = `${this.config.projectBasePath}/.gitignore`;
        if ((0, fs_1.existsSync)(gitIgnoreFilePath)) {
            const gitIgnoreFile = (0, fs_1.readFileSync)(`${this.config.projectBasePath}/.gitignore`, "utf-8");
            if ((0, includes_1.default)(gitIgnoreFile, this.config.configName))
                return;
            this.log(`You can add the ${this.config.configName} config file to the .gitignore file`, {
                color: "yellow",
                bold: true,
            });
        }
    }
}
exports.default = BaseClass;
