const { Command, flags } = require('@contentstack/cli-command');
const { configHandler } = require('@contentstack/cli-utilities');
const ContentstackManagementSDK = require('@contentstack/management');
const util = require('../../../util');
const config = require('../../../util/config');

class ExportToCsvCommand extends Command {
  static flags = {
    action: flags.string({
      required: false,
      multiple: false,
      options: ['a', 'b'],
      description: `Choose Action
a) ${config.exportEntries}
b) ${config.exportUsers}`,
      parse: (action) => {
        const actionObj = {
          a: config.exportEntries,
          b: config.exportUsers,
        };

        return actionObj[action];
      },
    }),
    'management-token-alias': flags.string({
      char: 'a',
      description: 'Alias of the management token',
    }),
    org: flags.string({
      multiple: false,
      required: false,
      description: 'Provide Organization UID to clone org users',
    }),
    'stack-name': flags.string({
      char: 'n',
      hidden: true,
      multiple: false,
      required: false,
      description: 'Name of the stack that needs to be created as csv filename.',
    }),
    'org-name': flags.string({
      hidden: true,
      multiple: false,
      required: false,
      description: 'Name of the organization that needs to be created as csv filename.',
    }),
    'language-code': flags.string({
      required: false,
      multiple: false,
      description: `Choose Language \x1b[32m Ex: csdx cm:entries:export-to-csv --language-code=fr-fr \x1b[36m
|--------------------------|---------|
|      Language            | code    |
|--------------------------|---------|
|  English - United States | en-us   |
|--------------------------|---------|
|  French - France         | fr-fr   |
|--------------------------|---------|
\x1b[37m`,
    }),
    'content-type': flags.string({
      required: false,
      multiple: false,
      description: `[optional] Content type \x1b[32m Ex: csdx cm:entries:export-to-csv --content-type="Page,Blog Post,Author" \x1b[36m
|------------------------------------------------|
|             Sample Content Types               |
|------------------------------------------------|
|  Page  | Header | Footer | Blog Post | Author  |
|------------------------------------------------|
\x1b[37m`,
    }),
  };

  get managementAPIClient() {
    this._managementAPIClient = ContentstackManagementSDK.client({ host: this.cmaHost, authtoken: this.authToken });
    return this._managementAPIClient;
  }

  async run() {
    if (!this.authToken) {
      this.error(config.CLI_EXPORT_CSV_LOGIN_FAILED, {
        exit: 2,
        suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
      });
    }

    try {
      let action;
      const {
        flags: {
          org,
          action: actionFlag,
          'org-name': orgName,
          'stack-name': stackName,
          'language-code': languageCode,
          'content-type': contentTypesFlag,
          'management-token-alias': managementTokenAlias,
        },
      } = this.parse(ExportToCsvCommand);

      if (actionFlag) {
        action = actionFlag;
      } else {
        action = await util.startupQuestions();
      }

      switch (action) {
        case config.exportEntries: {
          let stack;
          let language;
          let contentTypes = [];
          const listOfTokens = configHandler.get('tokens');

          if (managementTokenAlias && listOfTokens[managementTokenAlias]) {
            stack = {
              name: stackName || managementTokenAlias,
              apiKey: listOfTokens[managementTokenAlias].apiKey,
            };
          } else if (managementTokenAlias) {
            console.log('\x1b[31m ERROR: Provided management token alias not found in your config.!');
            this.exit();
          } else {
            let organization;

            if (org) {
              organization = { uid: org };
            } else {
              organization = await util.chooseOrganization(this.managementAPIClient); // prompt for organization
            }

            stack = await util.chooseStack(this.managementAPIClient, organization.uid); // prompt for stack
          }

          const contentTypeCount = await util.getContentTypeCount(this.managementAPIClient, stack.apiKey);
          const environments = await util.getEnvironments(this.managementAPIClient, stack.apiKey); // fetch environments, because in publish details only env uid are available and we need env names

          if (languageCode) {
            language = { code: languageCode };
          } else {
            language = await util.chooseLanguage(this.managementAPIClient, stack.apiKey); // prompt for language
          }

          if (contentTypesFlag) {
            contentTypes = (contentTypesFlag || '').split(',').map(this.snakeCase);
          } else {
            for (let index = 0; index <= contentTypeCount / 100; index++) {
              const contentTypesMap = await util.getContentTypes(this.managementAPIClient, stack.apiKey, index);
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

          while (contentTypes.length > 0) {
            let contentType = contentTypes.pop();

            const entriesCount = await util.getEntriesCount(
              this.managementAPIClient,
              stack.apiKey,
              contentType,
              language.code,
            );
            let flatEntries = [];
            for (let index = 0; index < entriesCount / 100; index++) {
              const entriesResult = await util.getEntries(
                this.managementAPIClient,
                stack.apiKey,
                contentType,
                language.code,
                index,
              );
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
          break;
        }
        case config.exportUsers: {
          try {
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
              this.log(`\x1b[31m Error: ${error.message}`);
            }

            this.error('failed export content to csv');
          }
          break;
        }
      }
    } catch (error) {
      if (error.message) {
        this.log(`\x1b[31m Error: ${error.message}`);
      }

      this.error('failed export content to csv');
    }
  }

  snakeCase(string) {
    return (string || '').split(' ').join('_').toLowerCase();
  }
}

ExportToCsvCommand.description = `Export entries or organization users to csv using this command`;

ExportToCsvCommand.examples = [
  'csdx cm:entries:export-to-csv',
  'csdx cm:entries:export-to-csv --action=<a|b> --language-code=<language-code> -a <management-token-alias> --content-type="Page,Blog" --org=<uid>',
];

ExportToCsvCommand.aliases = ['cm:export-to-csv'];

module.exports = ExportToCsvCommand;
