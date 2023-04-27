"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const map_1 = tslib_1.__importDefault(require("lodash/map"));
const cli_utilities_1 = require("@contentstack/cli-utilities");
const config_1 = tslib_1.__importDefault(require("../../config"));
const base_command_1 = require("./base-command");
const adapters_1 = require("../../adapters");
class Launch extends base_command_1.BaseCommand {
    async run() {
        if (!this.flags.init) {
            await this.getConfig();
        }
        await this.prepareApiClients();
        this.$event.on('provider-changed', () => {
            this.manageFlowBasedOnProvider();
        });
        // NOTE pre-check: manage flow and set the provider value
        await this.preCheckAndInitConfig();
        await this.manageFlowBasedOnProvider();
    }
    /**
     * @method manageFlowBasedOnProvider - Manage launch flow based on provider (GitHb, FileUpload etc.,)
     *
     * @return {*}  {Promise<void>}
     * @memberof Launch
     */
    async manageFlowBasedOnProvider() {
        const adapterConstructorInputs = {
            log: this.log,
            exit: process.exit,
            $event: this.$event,
            config: this.sharedConfig,
            apolloClient: this.apolloClient,
            managementSdk: this.managementSdk,
            analyticsInfo: this.context.analyticsInfo,
        };
        switch (this.sharedConfig.provider) {
            case 'GitHub':
                await new adapters_1.GitHub(adapterConstructorInputs).run();
                break;
            case 'FileUpload':
                await new adapters_1.FileUpload(adapterConstructorInputs).run();
                break;
            default:
                await this.preCheck.connectToAdapterOnUi();
                break;
        }
    }
    /**
     * @method preCheckAndInitConfig - prepare and initialize the configurations
     *
     * @return {*}  {Promise<void>}
     * @memberof Launch
     */
    async preCheckAndInitConfig() {
        this.preCheck = new adapters_1.PreCheck({
            log: this.log,
            exit: process.exit,
            $event: this.$event,
            config: this.sharedConfig,
            apolloClient: this.apolloClient,
            managementSdk: this.managementSdk,
            analyticsInfo: this.context.analyticsInfo,
        });
        await this.preCheck.run(!this.flags.type);
    }
}
exports.default = Launch;
Launch.hidden = false;
Launch.description = 'Launch related operations';
Launch.examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file>',
    '<%= config.bin %> <%= command.id %> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value>',
];
Launch.flags = {
    type: cli_utilities_1.Flags.string({
        options: [...config_1.default.supportedAdapters, 'FileUpload'],
        description: '[Optional] Choose the type of adapters',
    }),
    framework: cli_utilities_1.Flags.string({
        options: (0, map_1.default)(config_1.default.listOfFrameWorks, 'name'),
        description: '[Optional] Type of framework',
    }),
    org: cli_utilities_1.Flags.string({
        description: '[Optional] Provide the organization UID to create a new project or deployment',
    }),
    name: cli_utilities_1.Flags.string({
        char: 'n',
        description: '[Optional] Name of the project',
    }),
    environment: cli_utilities_1.Flags.string({
        char: 'e',
        description: '[Optional] Environment name for the Launch project',
    }),
    branch: cli_utilities_1.Flags.string({
        description: '[Optional] GitHub branch name',
    }),
    'build-command': cli_utilities_1.Flags.string({
        description: '[Optional] Build Command',
    }),
    'out-dir': cli_utilities_1.Flags.string({
        description: '[Optional] Output Directory',
    }),
    'show-variables': cli_utilities_1.Flags.boolean({
        hidden: true,
        default: false,
        description: '[Optional, Hidden] Show variable values on the UI',
    }),
    init: cli_utilities_1.Flags.boolean({
        description: '[Optional, Hidden] Reinitialize the project if it is an existing launch project.',
    }),
};
