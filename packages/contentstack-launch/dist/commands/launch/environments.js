"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const find_1 = tslib_1.__importDefault(require("lodash/find"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const util_1 = require("../../util");
const base_command_1 = require("./base-command");
const graphql_1 = require("../../graphql");
class Environments extends base_command_1.BaseCommand {
    async run() {
        var _a;
        this.logger = new util_1.Logger(this.sharedConfig);
        this.log = this.logger.log.bind(this.logger);
        await this.getConfig();
        await this.prepareApiClients();
        if (!((_a = this.sharedConfig.currentConfig) === null || _a === void 0 ? void 0 : _a.uid)) {
            await this.selectOrg();
            await this.selectProject();
        }
        await this.getEnvironments();
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
        const environments = await this.apolloClient
            .query({ query: graphql_1.environmentsQuery })
            .then(({ data: { Environments } }) => (0, map_1.default)(Environments.edges, 'node'))
            .catch((error) => {
            this.log(error === null || error === void 0 ? void 0 : error.message, 'error');
            process.exit(1);
        });
        cli_utilities_1.cliux.table((0, map_1.default)(environments, ({ uid, name, frameworkPreset }) => {
            var _a;
            return {
                uid: chalk_1.default.green(uid),
                name: chalk_1.default.green(name),
                frameworkPreset: chalk_1.default.green(((_a = (0, find_1.default)(this.sharedConfig.listOfFrameWorks, {
                    value: frameworkPreset,
                })) === null || _a === void 0 ? void 0 : _a.name) || ''),
            };
        }), {
            uid: {
                minWidth: 7,
                header: 'UID',
            },
            name: {
                minWidth: 7,
                header: 'Name',
            },
            frameworkPreset: {
                minWidth: 7,
                header: 'Framework',
            },
        });
    }
}
exports.default = Environments;
Environments.hidden = false;
Environments.description = 'Show list of environments for a project';
Environments.examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '$ <%= config.bin %> <%= command.id %> -d "current working directory"',
    '$ <%= config.bin %> <%= command.id %> -c "path to the local config file"',
    '$ <%= config.bin %> <%= command.id %> --org=<org UID> --project=<Project UID>',
];
Environments.flags = {
    org: cli_utilities_1.Flags.string({
        description: '[Optional] Provide the organization UID',
    }),
    project: cli_utilities_1.Flags.string({
        description: '[Optional] Provide the project UID',
    }),
    branch: cli_utilities_1.Flags.string({
        hidden: true,
        description: '[Optional] GitHub branch name',
    }),
};
