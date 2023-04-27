"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const isEmpty_1 = tslib_1.__importDefault(require("lodash/isEmpty"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const util_1 = require("../../util");
const base_command_1 = require("./base-command");
const graphql_1 = require("../../graphql");
class Deployments extends base_command_1.BaseCommand {
    async run() {
        var _a;
        this.logger = new util_1.Logger(this.sharedConfig);
        this.log = this.logger.log.bind(this.logger);
        if (!this.flags.environment) {
            await this.getConfig();
        }
        await this.prepareApiClients();
        if (!((_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.uid)) {
            await this.selectOrg();
            await this.selectProject();
        }
        await this.showDeployments();
    }
    /**
     * @method showDeployments
     *
     * @memberof Deployments
     */
    async showDeployments() {
        const environments = await this.getEnvironments();
        cli_utilities_1.cliux.table(environments, {
            environment: {
                minWidth: 7,
            },
            deploymentUrl: {
                minWidth: 7,
                header: 'Deployment Url',
            },
            commitMessage: {
                minWidth: 7,
                header: 'Commit Message',
            },
            createdAt: {
                minWidth: 7,
                header: 'Created At',
            },
        });
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
            if (this.sharedConfig.currentConfig.organizationUid) {
                this.log('Organization UID not found!', 'warn');
            }
        }
        if (!this.sharedConfig.currentConfig.organizationUid) {
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
    async getEnvironments() {
        var _a, _b, _c, _d, _e;
        const environments = await this.apolloClient
            .query({ query: graphql_1.environmentsQuery })
            .then(({ data: { Environments } }) => (0, map_1.default)(Environments.edges, 'node'))
            .catch((error) => {
            this.log(error === null || error === void 0 ? void 0 : error.message, 'error');
            process.exit(1);
        });
        let environment = (0, find_1.default)(environments, ({ uid, name }) => {
            var _a, _b, _c;
            return uid === this.flags.environment ||
                name === this.flags.environment ||
                uid === ((_c = (_b = (_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.environments) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.uid);
        });
        if ((0, isEmpty_1.default)(environment) && (this.flags.environment || ((_c = (_b = (_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.environments) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.uid))) {
            this.log('Environment(s) not found!', 'error');
            process.exit(1);
        }
        else if ((0, isEmpty_1.default)(environment)) {
            environment = await cli_utilities_1.cliux
                .inquire({
                type: 'search-list',
                name: 'Environment',
                choices: (0, map_1.default)(environments, (row) => ({ ...row, value: row.name })),
                message: 'Choose an environment',
            })
                .then((name) => (0, find_1.default)(environments, { name }));
            this.sharedConfig.currentConfig.deployments = (0, map_1.default)((_e = (_d = environments[0]) === null || _d === void 0 ? void 0 : _d.deployments) === null || _e === void 0 ? void 0 : _e.edges, 'node');
        }
        this.sharedConfig.environment = environment;
        return (0, map_1.default)(environment.deployments.edges, ({ node }) => {
            const { deploymentUrl: url, createdAt, commitMessage } = node;
            const deploymentUrl = chalk_1.default.cyan((url === null || url === void 0 ? void 0 : url.startsWith('https')) ? url : `https://${url}`);
            return {
                deploymentUrl,
                createdAt: chalk_1.default.green(createdAt),
                commitMessage: chalk_1.default.green(commitMessage),
                environment: chalk_1.default.green(environment.name),
            };
        });
    }
}
exports.default = Deployments;
Deployments.hidden = false;
Deployments.description = 'Show list of deployments for a environment';
Deployments.examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> -d "current working directory"',
    '$ <%= config.bin %> <%= command.id %> -c "path to the local config file"',
    '$ <%= config.bin %> <%= command.id %> -e "environment number or uid" --org=<org UID> --project=<Project UID>',
];
Deployments.flags = {
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
