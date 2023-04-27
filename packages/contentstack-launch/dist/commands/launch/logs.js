"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const forEach_1 = tslib_1.__importDefault(require("lodash/forEach"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const util_1 = require("../../util");
const base_command_1 = require("./base-command");
const index_1 = require("../../util/index");
const graphql_1 = require("../../graphql");
class Logs extends base_command_1.BaseCommand {
    async run() {
        await this.getConfig();
        await this.prepareApiClients();
        await this.logPollingAndInitConfig();
    }
    /**
     * @method logPollingAndInitConfig - prepare and initialize the configurations
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async logPollingAndInitConfig() {
        this.logger = new util_1.Logger(this.sharedConfig);
        this.log = this.logger.log.bind(this.logger);
        await this.checkAndSetProjectDetails();
        let logPolling = new index_1.LogPolling({
            apolloLogsClient: this.apolloLogsClient,
            apolloManageClient: this.apolloClient,
            config: this.sharedConfig,
            $event: this.$event,
        });
        if (this.flags.type === 's') {
            this.$event.on('server-logs', (event) => {
                this.showLogs(event);
            });
            await logPolling.serverLogs();
        }
        else {
            this.$event.on('deployment-logs', (event) => {
                this.showLogs(event);
            });
            await logPolling.deploymentLogs();
        }
    }
    /**
     * @method checkAndSetProjectDetails - validate and set project details like organizationUid, uid, environment, deployment
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async checkAndSetProjectDetails() {
        if (!this.sharedConfig.currentConfig.organizationUid) {
            await this.selectOrg();
        }
        if (!this.sharedConfig.currentConfig.uid) {
            await this.selectProject();
        }
        await this.validateAndSelectEnvironment();
        if (this.flags.deployment) {
            await this.validateDeployment();
        }
        else {
            await this.fetchLatestDeployment();
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
        this.sharedConfig.currentConfig.deployments = (_b = (_a = environments[0]) === null || _a === void 0 ? void 0 : _a.deployments) === null || _b === void 0 ? void 0 : _b.edges;
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
        const envDetail = (0, find_1.default)(environments.edges, ({ node: { uid, name } }) => {
            return name === this.flags.environment || uid === this.flags.environment;
        });
        if (envDetail) {
            this.sharedConfig.environment = envDetail.node.uid;
            this.sharedConfig.currentConfig.deployments = envDetail.node.deployments.edges;
        }
        else {
            this.sharedConfig.currentConfig.environments = environments.edges;
            await this.selectEnvironment();
        }
    }
    /**
     * @method validateDeployment - check whether deployment is validate or not.
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async validateDeployment() {
        if (!this.sharedConfig.currentConfig.deployments) {
            this.log('Deployment not found!', 'error');
            process.exit(1);
        }
        const deploymentDetail = (0, find_1.default)(this.sharedConfig.currentConfig.deployments, ({ node: { uid, deploymentNumber } }) => {
            return deploymentNumber === +this.flags.deployment || uid === this.flags.deployment;
        });
        if (deploymentDetail) {
            this.sharedConfig.deployment = deploymentDetail.node.uid;
        }
        else {
            this.log('Deployment name or UID not found!', 'error');
            process.exit(1);
        }
    }
    /**
     * @method showLogs - display emit messages.
     *
     * @return {*}  {void}
     * @memberof Logs
     */
    showLogs(event) {
        const { message, msgType } = event;
        if (msgType === 'info') {
            (0, forEach_1.default)(message, (log) => {
                var _a, _b;
                let formattedLogTimestamp = (_b = (_a = new Date(log.timestamp).toISOString()) === null || _a === void 0 ? void 0 : _a.slice(0, 23)) === null || _b === void 0 ? void 0 : _b.replace('T', ' ');
                this.log(`${formattedLogTimestamp}:  ${log.message}`, msgType);
            });
        }
        else if (msgType === 'error') {
            this.log(message, msgType);
        }
    }
    /**
     * @method fetchLatestDeployment - fetch latest deployment details.
     *
     * @return {*} {Promise<void>}
     * @memberof Logs
     */
    async fetchLatestDeployment() {
        var _a;
        if (!this.sharedConfig.currentConfig.deployments) {
            this.log('Deployment not found!', 'error');
            process.exit(1);
        }
        else {
            let lastDeploymentDetails = this.sharedConfig.currentConfig.deployments[0];
            if ((_a = lastDeploymentDetails === null || lastDeploymentDetails === void 0 ? void 0 : lastDeploymentDetails.node) === null || _a === void 0 ? void 0 : _a.uid) {
                this.sharedConfig.deployment = lastDeploymentDetails.node.uid;
            }
            else {
                this.log('Deployment not found!', 'error');
                process.exit(1);
            }
        }
    }
    /**
     * @method selectOrg - select organization
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async selectOrg() {
        var _a;
        const organizations = (await ((_a = this.managementSdk) === null || _a === void 0 ? void 0 : _a.organization().fetchAll().then(({ items }) => (0, map_1.default)(items, ({ uid, name }) => ({ name, value: name, uid }))).catch((error) => {
            this.log('Unable to fetch organizations.', 'warn');
            this.log(error, 'error');
            process.exit(1);
        }))) || [];
        this.sharedConfig.currentConfig.organizationUid = await cli_utilities_1.cliux
            .inquire({
            type: 'search-list',
            name: 'Organization',
            choices: organizations,
            message: 'Choose an organization',
        })
            .then((name) => { var _a; return (_a = (0, find_1.default)(organizations, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        await this.prepareApiClients();
    }
    /**
     * @method selectProject - select projects
     *
     * @return {*}  {Promise<void>}
     * @memberof Logs
     */
    async selectProject() {
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
        this.sharedConfig.currentConfig.uid = await cli_utilities_1.cliux
            .inquire({
            type: 'search-list',
            name: 'Project',
            choices: listOfProjects,
            message: 'Choose a project',
        })
            .then((name) => { var _a; return (_a = (0, find_1.default)(listOfProjects, { name })) === null || _a === void 0 ? void 0 : _a.uid; });
        await this.prepareApiClients();
    }
}
exports.default = Logs;
Logs.hidden = false;
Logs.description = 'Show deployment or server logs';
Logs.examples = [
    '$ csdx launch:logs',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir>',
    '$ csdx launch:logs --data-dir <path/of/current/working/dir> --type <options: d|s>',
    '$ csdx launch:logs --config <path/to/launch/config/file> --type <options: d|s>',
    '$ csdx launch:logs --deployment=deployment',
    '$ csdx launch:logs --environment=environment',
    '$ csdx launch:logs --environment=environment --deployment=deployment',
    '$ csdx launch:logs --environment=environment --type <options: d|s>',
    '$ csdx launch:logs --environment=environment --data-dir <path/of/current/working/dir> --deployment=deployment',
    '$ csdx launch:logs --environment=environment --config <path/to/launch/config/file> --deployment=deployment',
];
Logs.flags = {
    environment: cli_utilities_1.Flags.string({
        char: 'e',
        description: 'Environment name or UID',
    }),
    deployment: cli_utilities_1.Flags.string({
        description: 'Deployment number or UID',
    }),
    type: cli_utilities_1.Flags.string({
        required: false,
        default: 's',
        multiple: false,
        options: ['d', 's'],
        description: `Choose type of flags to show logs
      d) Deployment logs
      s) Server logs
      `,
    }),
};
