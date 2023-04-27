"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const open_1 = tslib_1.__importDefault(require("open"));
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const isEmpty_1 = tslib_1.__importDefault(require("lodash/isEmpty"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const util_1 = require("../../util");
const base_command_1 = require("./base-command");
const graphql_1 = require("../../graphql");
class Open extends base_command_1.BaseCommand {
    async run() {
        var _a, _b;
        this.logger = new util_1.Logger(this.sharedConfig);
        this.log = this.logger.log.bind(this.logger);
        if (!this.flags.environment)
            await this.getConfig();
        if (((_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.uid) && !(0, isEmpty_1.default)((_b = this.sharedConfig.currentConfig) === null || _b === void 0 ? void 0 : _b.deployments)) {
            this.openWebsite();
        }
        else {
            await this.prepareProjectDetails();
        }
    }
    /**
     * @method openWebsite - Open website URL on browser
     *
     * @memberof Open
     */
    openWebsite() {
        var _a, _b;
        const [deployment] = ((_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.deployments) || [];
        if (!(0, isEmpty_1.default)(deployment)) {
            const deploymentUrl = ((_b = deployment.deploymentUrl) === null || _b === void 0 ? void 0 : _b.startsWith('https'))
                ? deployment.deploymentUrl
                : `https://${deployment.deploymentUrl}`;
            (0, util_1.print)([
                { message: 'Deployment URL', bold: true },
                { message: deploymentUrl, color: 'cyan' },
            ]);
            (0, open_1.default)(deploymentUrl);
        }
        else {
            this.log('Website URL not found.!', 'error');
            this.exit(1);
        }
    }
    /**
     * @method checkAndSetProjectDetails - validate and set project details (ex. organizationUid, uid, environment, deployment)
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async prepareProjectDetails() {
        if (!this.sharedConfig.currentConfig.organizationUid) {
            await this.selectOrg();
        }
        // NOTE to get environment project UID must be passed as header
        if (!this.sharedConfig.currentConfig.uid) {
            await this.selectProject();
        }
        await this.validateAndSelectEnvironment();
        this.openWebsite();
    }
    /**
     * @method selectOrg - select organization
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async selectOrg() {
        var _a, _b, _c;
        const organizations = (await ((_a = this.managementSdk) === null || _a === void 0 ? void 0 : _a.organization().fetchAll().then(({ items }) => (0, map_1.default)(items, ({ uid, name }) => ({ name, value: name, uid }))).catch((error) => {
            this.log('Unable to fetch organizations.', 'warn');
            this.log(error, 'error');
            process.exit(1);
        }))) || [];
        if (this.flags.org || this.sharedConfig.currentConfig.organizationUid) {
            this.sharedConfig.currentConfig.organizationUid =
                ((_b = (0, find_1.default)(organizations, { uid: this.flags.org })) === null || _b === void 0 ? void 0 : _b.uid) ||
                    ((_c = (0, find_1.default)(organizations, {
                        uid: this.sharedConfig.currentConfig.organizationUid,
                    })) === null || _c === void 0 ? void 0 : _c.uid);
        }
        if (!this.sharedConfig.currentConfig.organizationUid) {
            this.log('Organization UID not found!', 'warn');
            this.sharedConfig.currentConfig.organizationUid = await cli_utilities_1.cliux
                .inquire({
                type: 'search-list',
                name: 'Organization',
                choices: organizations,
                message: 'Choose an organization',
            })
                .then((name) => { var _a; return (_a = (0, find_1.default)(organizations, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        }
        await this.prepareApiClients();
    }
    /**
     * @method selectProject - select projects
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async selectProject() {
        var _a, _b;
        const projects = await this.apolloClient
            .query({ query: graphql_1.projectsQuery, variables: { query: {} } })
            .then(({ data: { projects } }) => projects)
            .catch((error) => {
            this.log('Unable to fetch projects.!', { color: 'yellow' });
            this.log(error, 'error');
            process.exit(1);
        });
        const listOfProjects = (0, map_1.default)(projects.edges, ({ node: { uid, name } }) => ({
            name,
            value: name,
            uid,
        }));
        if (this.flags.project || this.sharedConfig.currentConfig.uid) {
            this.sharedConfig.currentConfig.uid =
                ((_a = (0, find_1.default)(listOfProjects, {
                    uid: this.flags.project,
                })) === null || _a === void 0 ? void 0 : _a.uid) ||
                    ((_b = (0, find_1.default)(listOfProjects, {
                        uid: this.sharedConfig.currentConfig.uid,
                    })) === null || _b === void 0 ? void 0 : _b.uid);
        }
        if (!this.sharedConfig.currentConfig.uid) {
            this.sharedConfig.currentConfig.uid = await cli_utilities_1.cliux
                .inquire({
                type: 'search-list',
                name: 'Project',
                choices: listOfProjects,
                message: 'Choose a project',
            })
                .then((name) => { var _a; return (_a = (0, find_1.default)(listOfProjects, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        }
        await this.prepareApiClients();
    }
    /**
     * @method validateAndSelectEnvironment - check whether environment is validate or not. If not then option to select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async validateAndSelectEnvironment() {
        const environments = await this.apolloClient
            .query({ query: graphql_1.environmentsQuery })
            .then(({ data: { Environments } }) => Environments)
            .catch((error) => {
            this.log(error === null || error === void 0 ? void 0 : error.message, 'error');
            process.exit(1);
        });
        const envDetail = (0, find_1.default)(environments.edges, ({ node: { uid, name } }) => name === this.flags.environment || uid === this.flags.environment);
        if (envDetail) {
            this.sharedConfig.environment = envDetail.node.uid;
            this.sharedConfig.currentConfig.deployments = (0, map_1.default)(envDetail.node.deployments.edges, 'node');
        }
        else {
            this.sharedConfig.currentConfig.environments = environments.edges;
            await this.selectEnvironment();
        }
    }
    /**
     * @method selectEnvironment - select environment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async selectEnvironment() {
        var _a, _b;
        if (!this.sharedConfig.currentConfig.environments) {
            this.log('Environment(s) not found!', 'error');
            process.exit(1);
        }
        const environments = (0, map_1.default)(this.sharedConfig.currentConfig.environments, ({ node: { uid, name, deployments } }) => ({
            name,
            value: name,
            uid,
            deployments,
        }));
        this.sharedConfig.environment = await cli_utilities_1.cliux
            .inquire({
            type: 'search-list',
            name: 'Environment',
            choices: environments,
            message: 'Choose an environment',
        })
            .then((name) => { var _a; return (_a = (0, find_1.default)(environments, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        this.sharedConfig.currentConfig.deployments = (0, map_1.default)((_b = (_a = environments[0]) === null || _a === void 0 ? void 0 : _a.deployments) === null || _b === void 0 ? void 0 : _b.edges, 'node');
    }
}
exports.default = Open;
Open.hidden = false;
Open.description = 'Open website for an environment';
Open.examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> --config <path/to/launch/config/file>',
    '$ <%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir>',
    '$ <%= config.bin %> <%= command.id %> --environment=environment',
    '$ <%= config.bin %> <%= command.id %> --environment=environment --config <path/to/launch/config/file>',
    '$ <%= config.bin %> <%= command.id %> --environment=environment --data-dir <path/of/current/working/dir>',
];
Open.flags = {
    org: cli_utilities_1.Flags.string({
        description: '[Optional] Provide the organization UID',
    }),
    project: cli_utilities_1.Flags.string({
        description: '[Optional] Provide the project UID',
    }),
    environment: cli_utilities_1.Flags.string({
        char: 'e',
        description: 'Environment name or UID',
    }),
    branch: cli_utilities_1.Flags.string({
        hidden: true,
        description: '[Optional] GitHub branch name',
    }),
};
