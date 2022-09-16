const { Command, flags } = require('@contentstack/cli-command');
const { configHandler } = require('@contentstack/cli-utilities');
const ContentstackManagementSDK = require('@contentstack/management');
const util = require('../../util');
const config = require('../../util/config');

class ExportToCsvCommand extends Command {
  static flags = {
    action: flags.string({
      required: false,
      multiple: false,
      options: ['entries', 'users'],
      description: `Option to export data (entries, users)`,
    }),
    alias: flags.string({
      char: 'a',
      description: 'Alias of the management token',
    }),
    org: flags.string({
      multiple: false,
      required: false,
      description: 'Provide organization UID to clone org users',
    }),
    'stack-name': flags.string({
      char: 'n',
      multiple: false,
      required: false,
      description: 'Name of the stack that needs to be created as csv filename.',
    }),
    'org-name': flags.string({
      multiple: false,
      required: false,
      description: 'Name of the organization that needs to be created as csv filename.',
    }),
    locale: flags.string({
      required: false,
      multiple: false,
      description: 'Locale for which entries need to be exported',
    }),
    'content-type': flags.string({
      description: 'Content type for which entries needs to be exported',
      required: false,
      multiple: false,
    }),
  };

  get getAuthToken() {
    try {
      return this.authToken;
    } catch (error) {
      return undefined;
    }
  }

  get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.getAuthToken });
    return this._managementAPIClient;
  }

  async run() {
    try {
      let action;
      const {
        flags: {
          org,
          action: actionFlag,
          'org-name': orgName,
          'stack-name': stackName,
          locale: locale,
          'content-type': contentTypesFlag,
          alias: managementTokenAlias,
        },
      } = await this.parse(ExportToCsvCommand);

      if (actionFlag) {
        action = actionFlag;
      } else {
        action = await util.startupQuestions();
      }

      switch (action) {
        case config.exportEntries:
        case 'entries': {
          try {
            let stack;
            let stackClient;
            let language;
            let contentTypes = [];
            const listOfTokens = configHandler.get('tokens');

            if (managementTokenAlias && listOfTokens[managementTokenAlias]) {
              stack = {
                name: stackName || managementTokenAlias,
                apiKey: listOfTokens[managementTokenAlias].apiKey,
                token: listOfTokens[managementTokenAlias].token,
              };
            } else if (managementTokenAlias) {
              this.error('Provided management token alias not found in your config.!');
            } else {
              let organization;

              if (!this.getAuthToken) {
                this.error(config.CLI_EXPORT_CSV_ENTRIES_ERROR, {
                  exit: 2,
                  suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
                });
              }

              if (org) {
                organization = { uid: org };
              } else {
                organization = await util.chooseOrganization(this.managementAPIClient); // prompt for organization
              }

              stack = await util.chooseStack(this.managementAPIClient, organization.uid); // prompt for stack
            }

            stackClient = this.getStackClient(stack);
            const contentTypeCount = await util.getContentTypeCount(stackClient);
            const environments = await util.getEnvironments(stackClient); // fetch environments, because in publish details only env uid are available and we need env names

            if (contentTypesFlag) {
              contentTypes = contentTypesFlag.split(',').map(this.snakeCase);
            } else {
              for (let index = 0; index <= contentTypeCount / 100; index++) {
                const contentTypesMap = await util.getContentTypes(stackClient, index);
                contentTypes = contentTypes.concat(Object.values(contentTypesMap)); // prompt for content Type
              }
            }

            if (contentTypes.length <= 0) {
              this.log('No content types found for the given stack');
              this.exit();
            }

            if (!contentTypesFlag) {
              contentTypes = await util.chooseInMemContentTypes(contentTypes);
            }

            if (locale) {
              language = { code: locale };
            } else {
              language = await util.chooseLanguage(stackClient); // prompt for language
            }

            while (contentTypes.length > 0) {
              let contentType = contentTypes.pop();

              const entriesCount = await util.getEntriesCount(stackClient, contentType, language.code);
              let flatEntries = [];
              for (let index = 0; index < entriesCount / 100; index++) {
                const entriesResult = await util.getEntries(stackClient, contentType, language.code, index);
                const flatEntriesResult = util.cleanEntries(
                  entriesResult.items,
                  language.code,
                  environments,
                  contentType,
                );
                flatEntries = flatEntries.concat(flatEntriesResult);
              }
              let fileName = `${stack.name}_${contentType}_${language.code}_entries_export.csv`;

              util.write(this, flatEntries, fileName, 'entries'); // write to file
            }
          } catch (error) {
            this.log(util.formatError(error));
          }
          break;
        }
        case config.exportUsers:
        case 'users': {
          try {
            if (!this.getAuthToken) {
              this.error(config.CLI_EXPORT_CSV_LOGIN_FAILED, {
                exit: 2,
                suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
              });
            }
            let organization;

            if (org) {
              organization = { uid: org, name: orgName || org };
            } else {
              organization = await util.chooseOrganization(this.managementAPIClient, action); // prompt for organization
            }

            const orgUsers = await util.getOrgUsers(this.managementAPIClient, organization.uid, this);
            const orgRoles = await util.getOrgRoles(this.managementAPIClient, organization.uid, this);
            const mappedUsers = util.getMappedUsers(orgUsers);
            const mappedRoles = util.getMappedRoles(orgRoles);
            const listOfUsers = util.cleanOrgUsers(orgUsers, mappedUsers, mappedRoles);
            const fileName = `${util.kebabize(
              organization.name.replace(config.organizationNameRegex, ''),
            )}_users_export.csv`;

            util.write(this, listOfUsers, fileName, 'organization details');
          } catch (error) {
            if (error.message) {
              this.log(util.formatError(error));
            }
          }
          break;
        }
      }
    } catch (error) {
      if (error.message) {
        this.log(util.formatError(error));
      }
    }
  }

  snakeCase(string) {
    return (string || '').split(' ').join('_').toLowerCase();
  }

  getStackClient(stack) {
    if (stack.token) {
      return ContentstackManagementSDK.client({ host: this.cmaHost }).stack({
        api_key: stack.apiKey,
        management_token: stack.token,
      });
    }
    return this.managementAPIClient.stack({ api_key: stack.apiKey });
  }
}

ExportToCsvCommand.description = `Export entries or organization users to csv using this command`;

ExportToCsvCommand.examples = [
  'csdx cm:export-to-csv',
  '',
  'Exporting entries to csv',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type>',
  '',
  'Exporting entries to csv with stack name provided',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name>',
  '',
  'Exporting organization users to csv',
  'csdx cm:export-to-csv --action <users> --org <org-uid>',
  '',
  'Exporting organization users to csv with organization name provided',
  'csdx cm:export-to-csv --action <users> --org <org-uid> --org-name <org-name>',
];

module.exports = ExportToCsvCommand;
