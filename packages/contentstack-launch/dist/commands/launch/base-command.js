"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
const tslib_1 = require("tslib");
const keys_1 = tslib_1.__importDefault(require("lodash/keys"));
const fs_1 = require("fs");
const events_1 = tslib_1.__importDefault(require("events"));
const path_1 = require("path");
const includes_1 = tslib_1.__importDefault(require("lodash/includes"));
const cli_command_1 = require("@contentstack/cli-command");
const cli_utilities_1 = require("@contentstack/cli-utilities");
const config_1 = tslib_1.__importDefault(require("../../config"));
const util_1 = require("../../util");
class BaseCommand extends cli_command_1.Command {
    async init() {
        await super.init();
        const { args, flags } = await this.parse({
            flags: this.ctor.flags,
            baseFlags: super.ctor.baseFlags,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags;
        this.args = args;
        cli_utilities_1.cliux.registerSearchPlugin();
        this.$event = new events_1.default();
        await this.prepareConfig();
        this.initCmaSDK();
        // Init logger
        const logger = new util_1.Logger(this.sharedConfig);
        this.log = logger.log.bind(logger);
    }
    async catch(err) {
        // add any custom logic to handle errors from the command
        // or simply return the parent class error handling
        return super.catch(err);
    }
    async finally(_) {
        // called after run and catch regardless of whether or not the command errored
        return super.finally(_);
    }
    /**
     * @method prepareConfig - init default Config data
     *
     * @memberof BaseCommand
     */
    async prepareConfig() {
        let configPath = this.flags["data-dir"] || this.flags.config
            ? this.flags.config || (0, path_1.join)(this.flags["data-dir"], config_1.default.configName)
            : (0, path_1.join)(process.cwd(), config_1.default.configName);
        const baseUrl = config_1.default.launchHubUrls[this.cmaAPIUrl];
        this.sharedConfig = {
            ...require("../../config").default,
            currentConfig: {},
            ...this.flags,
            flags: this.flags,
            host: this.cmaHost,
            config: configPath,
            projectBasePath: (0, path_1.dirname)(configPath),
            authtoken: cli_utilities_1.configHandler.get("authtoken"),
            authType: cli_utilities_1.configHandler.get("authorisationType"),
            authorization: cli_utilities_1.configHandler.get("oauthAccessToken"),
            logsApiBaseUrl: `${baseUrl}/${config_1.default.logsApiEndpoint}`,
            manageApiBaseUrl: `${baseUrl}/${config_1.default.manageApiEndpoint}`,
        };
        if (this.flags.type) {
            this.sharedConfig.provider = this.flags.type;
        }
        if ((0, fs_1.existsSync)(configPath)) {
            this.sharedConfig.isExistingProject = true;
        }
    }
    /**
     * @method getConfig - Get a config from list of existing .cs-launch.json file
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseCommand
     */
    async getConfig() {
        if (this.sharedConfig.config && (0, fs_1.existsSync)(this.sharedConfig.config)) {
            const config = require(this.sharedConfig.config);
            const configKeys = (0, keys_1.default)(config);
            if (this.flags.branch && (0, includes_1.default)(configKeys, this.flags.branch)) {
                this.sharedConfig.currentConfig = config[this.flags.branch];
            }
            else if ((configKeys === null || configKeys === void 0 ? void 0 : configKeys.length) > 1) {
                this.sharedConfig.currentConfig = await cli_utilities_1.cliux
                    .inquire({
                    name: "branch",
                    type: "search-list",
                    choices: configKeys,
                    message: "Choose a branch",
                })
                    .then((val) => config[val]);
            }
            else {
                this.sharedConfig.currentConfig = config[configKeys[0]];
            }
            this.sharedConfig.provider = this.sharedConfig.providerMapper[this.sharedConfig.currentConfig.projectType];
        }
    }
    /**
     * @methods prepareApiClients - Prepare Api Clients (Management SDK and apollo client)
     *
     * @return {*}  {Promise<void>}
     * @memberof BaseCommand
     */
    async prepareApiClients() {
        this.apolloClient = await new util_1.GraphqlApiClient({
            headers: {
                "x-cs-cli": this.context.analyticsInfo,
                "x-project-uid": this.sharedConfig.currentConfig.uid,
                organization_uid: this.sharedConfig.currentConfig.organizationUid,
            },
            baseUrl: this.sharedConfig.manageApiBaseUrl,
        }).apolloClient;
        this.apolloLogsClient = await new util_1.GraphqlApiClient({
            headers: {
                "x-cs-cli": this.context.analyticsInfo,
                "x-project-uid": this.sharedConfig.currentConfig.uid,
                organization_uid: this.sharedConfig.currentConfig.organizationUid,
            },
            baseUrl: this.sharedConfig.logsApiBaseUrl,
        }).apolloClient;
    }
    /**
     * @method initCmaSDK
     *
     * @memberof BaseCommand
     */
    async initCmaSDK() {
        cli_utilities_1.managementSDKInitiator.init(this.context);
        this.managementSdk = await (0, cli_utilities_1.managementSDKClient)({
            host: this.sharedConfig.host,
        });
    }
}
exports.BaseCommand = BaseCommand;
BaseCommand.hidden = true;
// define flags that can be inherited by any command that extends BaseCommand
BaseCommand.baseFlags = {
    "data-dir": cli_utilities_1.Flags.string({
        char: "d",
        description: "Current working directory",
    }),
    config: cli_utilities_1.Flags.string({
        char: "c",
        description: `Path to the local '${config_1.default.configName}' file`,
    }),
};
