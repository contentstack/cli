import map from 'lodash/map';
import { FlagInput, Flags } from '@contentstack/cli-utilities';

import config from '../../config';
import { BaseCommand } from '../../base-command';
import { AdapterConstructorInputs } from '../../types';
import { FileUpload, GitHub, PreCheck } from '../../adapters';

export default class Launch extends BaseCommand<typeof Launch> {
  public preCheck!: PreCheck;

  static description = 'Launch related operations';

  static examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file>',
    '<%= config.bin %> <%= command.id %> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --data-dir <path/of/current/working/dir> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --variable-type="Import variables from a stack" --alias=<value>',
    '<%= config.bin %> <%= command.id %> --config <path/to/launch/config/file> --type <options: GitHub|FileUpload> --name=<value> --environment=<value> --branch=<value> --build-command=<value> --framework=<option> --org=<value> --out-dir=<value> --variable-type="Manually add custom variables to the list" --env-variables="APP_ENV:prod, TEST_ENV:testVal"',
  ];

  static flags: FlagInput = {
    type: Flags.string({
      options: [...config.supportedAdapters, 'FileUpload'],
      description: '[Optional] Choose the type of adapters',
    }),
    framework: Flags.string({
      options: map(config.listOfFrameWorks, 'name'),
      description: '[Optional] Type of framework',
    }),
    org: Flags.string({
      description: '[Optional] Provide the organization UID to create a new project or deployment',
    }),
    name: Flags.string({
      char: 'n',
      description: '[Optional] Name of the project',
    }),
    environment: Flags.string({
      char: 'e',
      description: '[Optional] Environment name for the Launch project',
    }),
    branch: Flags.string({
      description: '[Optional] GitHub branch name',
    }),
    'build-command': Flags.string({
      description: '[Optional] Build Command',
    }),
    'out-dir': Flags.string({
      description: '[Optional] Output Directory',
    }),
    'variable-type': Flags.string({
      options: [...config.variablePreparationTypeOptions],
      description: '[Optional] Provide a variable type.',
    }),
    'show-variables': Flags.boolean({
      hidden: true,
      default: false,
      description: '[Optional, Hidden] Show variable values on the UI',
    }),
    init: Flags.boolean({
      hidden: true,
      description: '[Optional, Hidden] Reinitialize the project if it is an existing launch project.',
    }),
    alias: Flags.string({
      char: 'a',
      description: '[Optional] Alias(name) for the delivery token',
    }),
    'env-variables': Flags.string({
      description:
        '[Optional] Provide the environment variables in the key:value format, separated by comma Ex:APP_ENV:prod, TEST_ENV:testVal',
    }),
  };

  async run(): Promise<void> {
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
  async manageFlowBasedOnProvider(): Promise<void> {
    const adapterConstructorInputs: AdapterConstructorInputs = {
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
        await new GitHub(adapterConstructorInputs).run();
        break;
      case 'FileUpload':
        await new FileUpload(adapterConstructorInputs).run();
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
  async preCheckAndInitConfig(): Promise<void> {
    this.preCheck = new PreCheck({
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
