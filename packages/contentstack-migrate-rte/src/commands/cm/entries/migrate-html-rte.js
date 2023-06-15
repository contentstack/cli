const { Command } = require('@contentstack/cli-command');
const { printFlagDeprecation, flags } = require('@contentstack/cli-utilities');
const { isEmpty } = require('lodash');
const chalk = require('chalk');
let {
  getStack,
  getConfig,
  getToken,
  updateSingleContentTypeEntries,
  updateContentTypeForGlobalField,
  normalizeFlags,
} = require('../../../lib/util');

class JsonMigrationCommand extends Command {
  async run() {
    const { flags: migrateRteFlags } = await this.parse(JsonMigrationCommand);
    try {
      const normalizedFlags = normalizeFlags(migrateRteFlags);
      let config = await getConfig(normalizedFlags);
      if (isEmpty(config.paths)) {
        throw new Error('No value provided for the "paths" property in config.');
      }
      const stackOptions = { host: this.cmaHost };
      if (config.alias) {
        stackOptions.token = getToken(config.alias)
      }
      if (config['stack-api-key']) {
        stackOptions.stackApiKey = config['stack-api-key']
      }
      if (config.branch) stackOptions.branch = config.branch;
      let stack = await getStack(stackOptions);
      config.entriesCount = 0;
      config.contentTypeCount = 0;
      config.errorEntriesUid = {};
      if (config['global-field']) {
        await updateContentTypeForGlobalField(stack, config['content-type'], config);
      } else {
        await updateSingleContentTypeEntries(stack, config['content-type'], config);
      }
      console.log(
        chalk.green(`\nUpdated ${config.contentTypeCount} Content Type(s) and ${config.entriesCount} Entrie(s)`),
      );
      if (config.errorEntriesUid && Object.keys(config.errorEntriesUid).length > 0) {
        const failedCTs = Object.keys(config.errorEntriesUid);
        for (const failedCT of failedCTs) {
          const locales = Object.keys(config.errorEntriesUid[failedCT]);
          for (const locale of locales) {
            console.log(
              chalk.red(
                `Faced issue while migrating some entrie(s) for "${failedCT}" Content-type in "${locale}" locale,"${config.errorEntriesUid[
                  failedCT
                ][locale].join(', ')}"`,
              ),
            );
          }
        }
      }
    } catch (error) {
      this.error(error.message, { exit: 2 });
    }
  }
}

JsonMigrationCommand.description = 'Migration script to migrate content from HTML RTE to JSON RTE';

JsonMigrationCommand.flags = {
  'config-path': flags.string({
    char: 'c',
    description: 'Path to config file',
    required: false,
  }),
  alias: flags.string({
    char: 'a',
    description: 'Alias(name) for the management token',
    required: false,
  }),
  'stack-api-key': flags.string({
    description: 'Stack api key to be used',
    required: false,
  }),
  'content-type': flags.string({
    description: 'The content type from which entries will be migrated',
    required: false,
  }),
  'global-field': flags.boolean({
    description: 'This flag is set to false by default. It indicates that current content type is a globalfield',
    default: false,
    required: false,
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Agree to process the command with the current configuration',
    default: false,
    required: false,
  }),
  branch: flags.string({
    description: '[optional] branch name',
  }),
  'html-path': flags.string({
    description: 'Provide path of HTML RTE to migrate',
    dependsOn: ['json-path'],
    required: false,
  }),
  'json-path': flags.string({
    description: 'Provide path of JSON RTE to migrate',
    dependsOn: ['html-path'],
    required: false,
  }),
  delay: flags.integer({
    description: 'Provide delay in ms between two entry update',
    default: 1000,
    required: false,
  }),
  locale: flags.string({
    description: 'The locale from which entries will be migrated',
    required: false,
  }),
  'batch-limit': flags.integer({ description: 'Provide batch limit for updating entries', default: 50 }),

  //To be deprecated
  configPath: flags.string({
    char: 'p',
    description: 'Path to the config file',
    hidden: true,
    parse: printFlagDeprecation(['-p', '--configPath'], ['-c', '--config-path']),
  }),
  content_type: flags.string({
    description: 'The content-type from which entries need to be migrated',
    hidden: true,
    parse: printFlagDeprecation(['-c', '--content_type'], ['--content-type']),
  }),
  isGlobalField: flags.boolean({
    char: 'g',
    description: 'This flag is set to false by default. It indicates that current content-type is global-field',
    hidden: true,
    parse: printFlagDeprecation(['-g', '--isGlobalField'], ['--global-field']),
  }),
  htmlPath: flags.string({
    char: 'h',
    description: 'Provide path of HTML RTE to migrate',
    hidden: true,
    parse: printFlagDeprecation(['-h', '--htmlPath'], ['--html-path']),
  }),
  jsonPath: flags.string({
    char: 'j',
    description: 'Provide path of JSON RTE to migrate',
    hidden: true,
    parse: printFlagDeprecation(['-j', '--jsonPath'], ['--json-path']),
  }),
};

JsonMigrationCommand.examples = [
  'General Usage',
  'csdx cm:entries:migrate-html-rte --config-path path/to/config.json',
  '',
  'Using Flags',
  'csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path html-path --json-path json-path',
  '',
  'Nested RTE',
  'csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path modular_block_uid.block_uid.html_rte_uid --json-path modular_block_uid.block_uid.json_rte_uid',
  '',
  'csdx cm:entries:migrate-html-rte --alias alias --content-type content_type_uid --html-path group_uid.html_rte_uid --json-path group_uid.json_rte_uid',
  '',
  'Global Field',
  'csdx cm:entries:migrate-html-rte --alias alias --content-type global_field_uid --global-field --html-path html-path --json-path json-path',
];

JsonMigrationCommand.aliases = ['cm:migrate-rte'];

module.exports = JsonMigrationCommand;
