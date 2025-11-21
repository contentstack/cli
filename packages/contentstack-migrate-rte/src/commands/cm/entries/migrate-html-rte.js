const { Command } = require('@contentstack/cli-command');
const { flags } = require('@contentstack/cli-utilities');
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
        stackOptions.token = getToken(config.alias);
      }
      if (config['stack-api-key']) {
        stackOptions.stackApiKey = config['stack-api-key'];
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
    description: 'Specify the path where your config file is located.',
    required: false,
  }),
  alias: flags.string({
    char: 'a',
    description: 'Enter the alias name. You must use either the --alias flag or the --stack-api-key flag.',
    required: false,
  }),
  'stack-api-key': flags.string({
    description: 'API key of the source stack. You must use either the --stack-api-key flag or the --alias flag.',
    required: false,
  }),
  'content-type': flags.string({
    description: 'Specify the UID of the content type for which you want to migrate HTML RTE content.',
    required: false,
  }),
  'global-field': flags.boolean({
    description:
      'Checks whether the specified UID belongs to a content type or a global field. This flag is set to false by default.',
    default: false,
    required: false,
  }),
  yes: flags.boolean({
    char: 'y',
    description: 'Avoids reconfirmation of your configuration.',
    default: false,
    required: false,
  }),
  branch: flags.string({
    description: 'The name of the branch to be used.',
    required: false,
  }),
  'html-path': flags.string({
    description: 'Enter the path to the HTML RTE whose content you want to migrate.',
    dependsOn: ['json-path'],
    required: false,
  }),
  'json-path': flags.string({
    description: 'Enter the path to the JSON RTE to which you want to migrate the HTML RTE content.',
    dependsOn: ['html-path'],
    required: false,
  }),
  delay: flags.integer({
    description:
      'To set the interval time between the migration of HTML RTE to JSON RTE in subsequent entries of a content type. The default value is 1,000 milliseconds.',
    default: 1000,
    required: false,
  }),
  locale: flags.string({
    description: 'The locale from which entries will be migrated.',
    required: false,
  }),
  'batch-limit': flags.integer({
    description: 'Provide batch limit for updating entries (default: 50).',
    default: 50,
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

JsonMigrationCommand.aliases = [];

module.exports = JsonMigrationCommand;
