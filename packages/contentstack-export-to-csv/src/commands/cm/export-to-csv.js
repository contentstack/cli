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
const interactive = require('../../util/interactive');

class ExportToCsvCommand extends Command {
  static flags = {
    action: flags.string({
      required: false,
      multiple: false,
      options: ['entries', 'users', 'taxonomies'],
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
    'taxonomy-uid': flags.string({
      description: 'Provide taxonomy uid fow which terms need to be exported',
    }),
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
          'taxonomy-uid': taxonomyUID,
        },
      } = await this.parse(ExportToCsvCommand);

      if (!managementTokenAlias) {
        managementAPIClient = await managementSDKClient({ host: this.cmaHost });
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

            if (managementTokenAlias) {
              const { stackDetails, apiClient } = await this.getAliasDetails(managementTokenAlias, stackName);
              managementAPIClient = apiClient;
              stack = stackDetails;
            } else {
              stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
            }

            stackAPIClient = this.getStackClient(managementAPIClient, stack);
            await this.checkAndUpdateBranchDetail(branchUid, stack, stackAPIClient, managementAPIClient);

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
            if (!isAuthenticated()) {
              this.error(config.CLI_EXPORT_CSV_LOGIN_FAILED, {
                exit: 2,
                suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
              });
            }
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
        case config.exportTaxonomies:
        case 'taxonomies': {
          let stack;
          let stackAPIClient;
          let taxUID;
          if (managementTokenAlias) {
            const { stackDetails, apiClient } = await this.getAliasDetails(managementTokenAlias, stackName);
            managementAPIClient = apiClient;
            stack = stackDetails;
          } else {
            stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
          }
          if (taxonomyUID) {
            taxUID = taxonomyUID;
          } else {
            taxUID = await interactive.askTaxonomyUID();
          }

          stackAPIClient = this.getStackClient(managementAPIClient, stack);
          await this.createTaxonomyAndTermCsvFile(stackName, stack, taxUID);
          break;
        }
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

  /**
   * check whether branch enabled org or not and update branch details
   * @param {string} branchUid 
   * @param {object} stack 
   * @param {*} stackAPIClient 
   * @param {*} managementAPIClient 
   */
  async checkAndUpdateBranchDetail(branchUid, stack, stackAPIClient, managementAPIClient) {
    if (branchUid) {
      try {
        const branchExists = await doesBranchExist(stackAPIClient, branchUid);
        if (branchExists?.errorCode) {
          throw new Error(branchExists.errorMessage);
        }
        stack.branch_uid = branchUid;
        stackAPIClient = getStackClient(managementAPIClient, stack);
      } catch (error) {
        if (error?.message || error?.errorMessage) {
          cliux.error(util.formatError(error));
          this.exit();
        }
      }
    } else {
      const stackBranches = await this.getStackBranches(stackAPIClient);
      if (stackBranches === undefined) {
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
      } else {
        const { branch } = await util.chooseBranch(stackBranches);
        stack.branch_uid = branch;
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
      }
    }
  }

  /**
   * fetch stack details from alias token
   * @param {string} managementTokenAlias 
   * @param {string} stackName 
   * @returns 
   */
  async getAliasDetails(managementTokenAlias, stackName) {
    let apiClient, stackDetails;
    const listOfTokens = configHandler.get('tokens');
    if (managementTokenAlias && listOfTokens[managementTokenAlias]) {
      apiClient = await managementSDKClient({
        host: this.cmaHost,
        management_token: listOfTokens[managementTokenAlias].token,
      });
      stackDetails = {
        name: stackName || managementTokenAlias,
        apiKey: listOfTokens[managementTokenAlias].apiKey,
        token: listOfTokens[managementTokenAlias].token,
      };
    } else if (managementTokenAlias) {
      this.error('Provided management token alias not found in your config.!');
    }
    return {
      apiClient,
      stackDetails,
    };
  }

  /**
   * fetch stack details on basis of the selected org and stack
   * @param {*} managementAPIClient 
   * @param {string} stackAPIKey 
   * @param {string} org 
   * @returns 
   */
  async getStackDetails(managementAPIClient, stackAPIKey, org) {
    let organization, stackDetails;

    if (!isAuthenticated()) {
      this.error(config.CLI_EXPORT_CSV_ENTRIES_ERROR, {
        exit: 2,
        suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
      });
    }

    if (org) {
      organization = { uid: org };
    } else {
      organization = await util.chooseOrganization(managementAPIClient); // prompt for organization
    }
    if (!stackAPIKey) {
      stackDetails = await util.chooseStack(managementAPIClient, organization.uid); // prompt for stack
    } else {
      stackDetails = await util.chooseStack(managementAPIClient, organization.uid, stackAPIKey);
    }
    return stackDetails;
  }

  /**
   * Create a taxonomies csv file for stack and a terms csv file for associated taxonomies
   * @param {string} stackName 
   * @param {object} stack 
   * @param {string} taxUID 
   */
  async createTaxonomyAndTermCsvFile(stackName, stack, taxUID){
    const { cma } = configHandler.get('region') || {};
    const payload = {
      baseUrl: `${cma}/v3/taxonomies`,
      apiKey: stack.apiKey,
      mgToken: stack?.token
    };
    //check whether the taxonomy is valid or not
    const taxonomy = await util.getTaxonomy(payload, taxUID);

    payload['url'] = payload.baseUrl;
    const taxonomies = await util.getAllTaxonomies(payload);
    const formattedTaxonomiesData = util.formatTaxonomiesData(taxonomies);
    let fileName = `${stackName ? stackName : stack.name}_taxonomies.csv`;
    util.write(this, formattedTaxonomiesData, fileName, 'taxonomies'); 

    payload['url'] = `${payload.baseUrl}/${taxUID}/terms`;
    const terms = await util.getAllTermsOfTaxonomy(payload);
    const formattedTermsData = util.formatTermsOfTaxonomyData(terms, taxUID);
    fileName = `${stackName ? stackName : stack.name}_${taxonomy?.name ? taxonomy.name : ''}_${taxUID}_terms.csv`;
    util.write(this, formattedTermsData, fileName, 'terms');
  }
}

ExportToCsvCommand.description = `Export entries or organization users to csv using this command`;

ExportToCsvCommand.examples = [
  'csdx cm:export-to-csv',
  '',
  'Exporting entries to csv',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type>',
  '',
  'Exporting entries to csv with stack name provided and branch name provided',
  'csdx cm:export-to-csv --action <entries> --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name> --branch <branch-name>',
  '',
  'Exporting organization users to csv',
  'csdx cm:export-to-csv --action <users> --org <org-uid>',
  '',
  'Exporting organization users to csv with organization name provided',
  'csdx cm:export-to-csv --action <users> --org <org-uid> --org-name <org-name>',
];

module.exports = ExportToCsvCommand;
