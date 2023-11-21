const { Command } = require('@contentstack/cli-command');
const {
  configHandler,
  managementSDKClient,
  flags,
  isAuthenticated,
  cliux,
  doesBranchExist,
} = require('@contentstack/cli-utilities');
const util = require('../../util');
const config = require('../../util/config');

class ExportToCsvCommand extends Command {
  static flags = {
    action: flags.string({
      required: false,
      multiple: false,
      options: ['entries', 'users', 'teams'],
      description: `Option to export data (entries, users, teams)`,
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
    'stack-api-key': flags.string({
      char: 'k',
      multiple: false,
      required: false,
      description: 'API key of the source stack',
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
    branch: flags.string({
      description: 'Branch from which entries need to be exported',
      multiple: false,
      required: false,
    }),
    "team-uid": flags.string({
      description: 'Uid of the team whose user data and stack roles are required'
    })
  };

  async run() {
    try {
      let action, managementAPIClient;
      const {
        flags: {
          org,
          action: actionFlag,
          'org-name': orgName,
          'stack-name': stackName,
          'stack-api-key': stackAPIKey,
          locale: locale,
          'content-type': contentTypesFlag,
          alias: managementTokenAlias,
          branch: branchUid,
          "team-uid": teamUid
        },
      } = await this.parse(ExportToCsvCommand);

      if (!managementTokenAlias) {
        managementAPIClient = await managementSDKClient({ host: this.cmaHost });
        if (!isAuthenticated()) {
          this.error(config.CLI_EXPORT_CSV_ENTRIES_ERROR, {
            exit: 2,
            suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
          });
        }
      }

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
            let stackAPIClient;
            let language;
            let contentTypes = [];
            let stackBranches;
            const listOfTokens = configHandler.get('tokens');

            if (managementTokenAlias && listOfTokens[managementTokenAlias]) {
              managementAPIClient = await managementSDKClient({
                host: this.cmaHost,
                management_token: listOfTokens[managementTokenAlias].token,
              });
              stack = {
                name: stackName || managementTokenAlias,
                apiKey: listOfTokens[managementTokenAlias].apiKey,
                token: listOfTokens[managementTokenAlias].token,
              };
            } else if (managementTokenAlias) {
              this.error('Provided management token alias not found in your config.!');
            } else {
              let organization;
              if (org) {
                organization = { uid: org };
              } else {
                organization = await util.chooseOrganization(managementAPIClient); // prompt for organization
              }
              if (!stackAPIKey) {
                stack = await util.chooseStack(managementAPIClient, organization.uid); // prompt for stack
              } else {
                stack = await util.chooseStack(managementAPIClient, organization.uid, stackAPIKey);
              }
            }

            stackAPIClient = this.getStackClient(managementAPIClient, stack);

            if (branchUid) {
              try {
                const branchExists = await doesBranchExist(stackAPIClient, branchUid);
                if (branchExists?.errorCode) {
                  throw new Error(branchExists.errorMessage);
                }
                stack.branch_uid = branchUid;
                stackAPIClient = this.getStackClient(managementAPIClient, stack);
              } catch (error) {
                if (error.message || error.errorMessage) {
                  cliux.error(util.formatError(error));
                  this.exit();
                }
              }
            } else {
              stackBranches = await this.getStackBranches(stackAPIClient);
              if (stackBranches === undefined) {
                stackAPIClient = this.getStackClient(managementAPIClient, stack);
              } else {
                const { branch } = await util.chooseBranch(stackBranches);
                stack.branch_uid = branch;
                stackAPIClient = this.getStackClient(managementAPIClient, stack);
              }
            }

            const contentTypeCount = await util.getContentTypeCount(stackAPIClient);

            const environments = await util.getEnvironments(stackAPIClient); // fetch environments, because in publish details only env uid are available and we need env names

            if (contentTypesFlag) {
              contentTypes = contentTypesFlag.split(',').map(this.snakeCase);
              const contentTypesArray = await stackAPIClient
                .contentType()
                .query()
                .find()
                .then((res) => res.items.map((contentType) => contentType.uid));

              const doesContentTypeExist = contentTypesArray.includes(contentTypesFlag);

              if (!doesContentTypeExist) {
                throw new Error(
                  `The Content Type ${contentTypesFlag} was not found. Please try again. Content Type is not valid.`,
                );
              }
            } else {
              for (let index = 0; index <= contentTypeCount / 100; index++) {
                const contentTypesMap = await util.getContentTypes(stackAPIClient, index);
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
              language = await util.chooseLanguage(stackAPIClient); // prompt for language
            }

            while (contentTypes.length > 0) {
              let contentType = contentTypes.pop();

              const entriesCount = await util.getEntriesCount(stackAPIClient, contentType, language.code);
              let flatEntries = [];
              for (let index = 0; index < entriesCount / 100; index++) {
                const entriesResult = await util.getEntries(stackAPIClient, contentType, language.code, index, 100);
                const flatEntriesResult = util.cleanEntries(
                  entriesResult.items,
                  language.code,
                  environments,
                  contentType,
                );
                flatEntries = flatEntries.concat(flatEntriesResult);
              }
              let fileName = `${stackName ? stackName : stack.name}_${contentType}_${language.code}_entries_export.csv`;
              util.write(this, flatEntries, fileName, 'entries'); // write to file
            }
          } catch (error) {
            cliux.error(util.formatError(error));
          }
          break;
        }
        case config.exportUsers:
        case 'users': {
          try {
            let organization;

            if (org) {
              organization = { uid: org, name: orgName || org };
            } else {
              organization = await util.chooseOrganization(managementAPIClient, action); // prompt for organization
            }

            const orgUsers = await util.getOrgUsers(managementAPIClient, organization.uid, this);
            const orgRoles = await util.getOrgRoles(managementAPIClient, organization.uid, this);
            const mappedUsers = util.getMappedUsers(orgUsers);
            const mappedRoles = util.getMappedRoles(orgRoles);
            const listOfUsers = util.cleanOrgUsers(orgUsers, mappedUsers, mappedRoles);
            const fileName = `${util.kebabize(
              (orgName ? orgName : organization.name).replace(config.organizationNameRegex, ''),
            )}_users_export.csv`;

            util.write(this, listOfUsers, fileName, 'organization details');
          } catch (error) {
            if (error.message || error.errorMessage) {
              cliux.error(util.formatError(error));
            }
          }
          break;
        }
        case config.exportTeams:
        case 'teams': {
          try{
            let organization;
            if (org) {
              organization = { uid: org, name: orgName || org };
            } else {
              organization = await util.chooseOrganization(managementAPIClient, action); // prompt for organization
            }
          
            await util.exportTeams(managementAPIClient,organization,teamUid);
          } catch (error) {
            if (error.message || error.errorMessage) {
              cliux.error(util.formatError(error));
            }
          }
        }
        break;
      }
    } catch (error) {
      if (error.message || error.errorMessage) {
        cliux.error(util.formatError(error));
      }
    }
  }

  snakeCase(string) {
    return (string || '').split(' ').join('_').toLowerCase();
  }

  getStackClient(managementAPIClient, stack) {
    const stackInit = {
      api_key: stack.apiKey,
      branch_uid: stack.branch_uid,
    };
    if (stack.token) {
      return managementAPIClient.stack({
        ...stackInit,
        management_token: stack.token,
      });
    }
    return managementAPIClient.stack(stackInit);
  }

  getStackBranches(stackAPIClient) {
    return stackAPIClient
      .branch()
      .query()
      .find()
      .then(({ items }) => (items !== undefined ? items : []))
      .catch((_err) => {});
  }
}

ExportToCsvCommand.description = `Export entries or organization users to csv using this command`;

ExportToCsvCommand.examples = [
  'csdx cm:export-to-csv',
  '',
  'Exporting entries to CSV',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type>',
  '',
  'Exporting entries to CSV with stack name provided and branch name provided',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name> --branch <branch-name>',
  '',
  'Exporting organization users to CSV',
  'csdx cm:export-to-csv --action <users> --org <org-uid>',
  '',
  'Exporting organization users to CSV with organization name provided',
  'csdx cm:export-to-csv --action <users> --org <org-uid> --org-name <org-name>',
  '',
  'Exporting organization teams to CSV',
  'csdx cm:export-to-csv --action <teams>',
  '',
  'Exporting organization teams to CSV with org UID',
  'csdx cm:export-to-csv --action <teams> --org <org-uid>',
  '',
  'Exporting organization teams to CSV with team UID',
  'csdx cm:export-to-csv --action <teams> --team-uid <team-uid>',
  '',
  'Exporting organization teams to CSV with org UID and team UID',
  'csdx cm:export-to-csv --action <teams> --org <org-uid> --team-uid <team-uid>',
  '',
  'Exporting organization teams to CSV with org UID and team UID',
  'csdx cm:export-to-csv --action <teams> --org <org-uid> --team-uid <team-uid> --org-name <org-name>',
];

module.exports = ExportToCsvCommand;
