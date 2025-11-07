const { Command } = require('@contentstack/cli-command');
const {
  configHandler,
  managementSDKClient,
  flags,
  isAuthenticated,
  cliux,
  doesBranchExist,
  isManagementTokenValid,
} = require('@contentstack/cli-utilities');
const util = require('../../util');
const config = require('../../util/config');

class ExportToCsvCommand extends Command {
  static flags = {
    action: flags.string({
      required: false,
      multiple: false,
      options: ['entries', 'users', 'teams', 'taxonomies'],
      description:
        'Option to export data (entries, users, teams, taxonomies). <options: entries|users|teams|taxonomies>',
    }),
    alias: flags.string({
      char: 'a',
      description: 'Alias of the management token.',
    }),
    org: flags.string({
      multiple: false,
      required: false,
      description: 'Provide organization UID to clone org users.',
    }),
    'stack-name': flags.string({
      char: 'n',
      multiple: false,
      required: false,
      description: 'Name of the stack that needs to be created as CSV filename.',
    }),
    'stack-api-key': flags.string({
      char: 'k',
      multiple: false,
      required: false,
      description: 'API Key of the source stack.',
    }),
    'org-name': flags.string({
      multiple: false,
      required: false,
      description: 'Name of the organization that needs to be created as CSV filename.',
    }),
    locale: flags.string({
      required: false,
      multiple: false,
      description: 'Locale of entries that will be exported.',
    }),
    'content-type': flags.string({
      description: 'Content type of entries that will be exported.',
      required: false,
      multiple: false,
    }),
    branch: flags.string({
      description: 'Branch from which entries will be exported.',
      multiple: false,
      required: false,
    }),
    'team-uid': flags.string({
      description: 'Provide the UID of a specific team in an organization.',
    }),
    'taxonomy-uid': flags.string({
      description: 'Provide the taxonomy UID of the related terms you want to export.',
    }),
    'include-fallback': flags.boolean({
      description:
        "[Optional] Include fallback locale data when exporting taxonomies. When enabled, if a taxonomy term doesn't exist in the specified locale, it will fallback to the hierarchy defined in the branch settings.",
      default: false,
    }),
    'fallback-locale': flags.string({
      description:
        "[Optional] Specify a specific fallback locale for taxonomy export. This locale will be used when a taxonomy term doesn't exist in the primary locale. Takes priority over branch fallback hierarchy when both are specified.",
      required: false,
    }),
    delimiter: flags.string({
      description:
        "[optional] Provide a delimiter to separate individual data fields within the CSV file. For example: cm:export-to-csv --delimiter '|'",
      default: ',',
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
          'team-uid': teamUid,
          'taxonomy-uid': taxonomyUID,
          'include-fallback': includeFallback,
          'fallback-locale': fallbackLocale,
          delimiter,
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

            if (managementTokenAlias) {
              const { stackDetails, apiClient } = await this.getAliasDetails(managementTokenAlias, stackName);
              managementAPIClient = apiClient;
              stack = stackDetails;
            } else {
              stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
            }

            stackAPIClient = this.getStackClient(managementAPIClient, stack);
            stackAPIClient = await this.checkAndUpdateBranchDetail(
              branchUid,
              stack,
              stackAPIClient,
              managementAPIClient,
            );

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
              util.write(this, flatEntries, fileName, 'entries', delimiter); // write to file
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

            util.write(this, listOfUsers, fileName, 'organization details', delimiter);
          } catch (error) {
            if (error.message || error.errorMessage) {
              cliux.error(util.formatError(error));
            }
          }
          break;
        }
        case config.exportTeams:
        case 'teams': {
          try {
            let organization;
            if (org) {
              organization = { uid: org, name: orgName || org };
            } else {
              organization = await util.chooseOrganization(managementAPIClient, action); // prompt for organization
            }

            await util.exportTeams(managementAPIClient, organization, teamUid, delimiter);
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
          let language;
          let stackAPIClient;
          let finalIncludeFallback = includeFallback;
          let finalFallbackLocale = fallbackLocale;

          if (managementTokenAlias) {
            const { stackDetails, apiClient } = await this.getAliasDetails(managementTokenAlias, stackName);
            managementAPIClient = apiClient;
            stack = stackDetails;
          } else {
            stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
          }

          stackAPIClient = this.getStackClient(managementAPIClient, stack);
          if (locale) {
            language = { code: locale };
          } else {
            language = await util.chooseLanguage(stackAPIClient);
          }

          // if (includeFallback === undefined || fallbackLocale === undefined) {
          //   const fallbackOptions = await util.chooseFallbackOptions(stackAPIClient);
          // }


          if (fallbackLocale !== undefined) {
            finalFallbackLocale = fallbackLocale;
          }

          await this.createTaxonomyAndTermCsvFile(stackAPIClient, stackName, stack, taxonomyUID, delimiter, {
            locale: language.code,
            branch: branchUid,
            include_fallback: finalIncludeFallback,
            fallback_locale: finalFallbackLocale,
          });
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
    };
    if (stack?.branch_uid) stackInit['branch_uid'] = stack.branch_uid;
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
      .catch(() => {});
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
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
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
    return stackAPIClient;
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
      const checkManagementTokenValidity = await isManagementTokenValid(
        listOfTokens[managementTokenAlias].apiKey,
        listOfTokens[managementTokenAlias].token,
      );
      if (Object.prototype.hasOwnProperty.call(checkManagementTokenValidity, 'message')) {
        throw checkManagementTokenValidity.valid === 'failedToCheck'
          ? checkManagementTokenValidity.message
          : `error: Management token or stack API key is invalid. ${checkManagementTokenValidity.message}`;
      }
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
  async createTaxonomyAndTermCsvFile(stackAPIClient, stackName, stack, taxUID, delimiter, localeOptions = {}) {
    const payload = {
      stackAPIClient,
      type: '',
      limit: config.limit || 100,
      ...localeOptions, // Spread locale, branch, include_fallback, fallback_locale
    };
    //check whether the taxonomy is valid or not
    let taxonomies = [];
    if (taxUID) {
      payload['taxonomyUID'] = taxUID;
      const taxonomy = await util.getTaxonomy(payload);
      taxonomies.push(taxonomy);
    } else {
      taxonomies = await util.getAllTaxonomies(payload);
    }

    if (!taxonomies?.length) {
      cliux.print('info: No taxonomies found!', { color: 'blue' });
    } else {
      const fileName = `${stackName ?? stack.name}_taxonomies.csv`;
      const { taxonomiesData, headers } = await util.createImportableCSV(payload, taxonomies);
      if (taxonomiesData?.length) {
        util.write(this, taxonomiesData, fileName, 'taxonomies', delimiter, headers);
      }
    }
  }
}

ExportToCsvCommand.description = `Export entries, taxonomies, terms or organization users to csv using this command`;

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
  '',
  'Exporting taxonomies and related terms to a .CSV file with the provided taxonomy UID',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --taxonomy-uid <taxonomy-uid>',
  '',
  'Exporting taxonomies and respective terms to a .CSV file',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias>',
  '',
  'Exporting taxonomies and respective terms to a .CSV file with a delimiter',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --delimiter <delimiter>',
  '',
  'Exporting taxonomies with specific locale',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --locale <locale>',
  '',
  'Exporting taxonomies with fallback locale support',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --locale <locale> --include-fallback',
  '',
  'Exporting taxonomies with custom fallback locale',
  'csdx cm:export-to-csv --action <taxonomies> --alias <management-token-alias> --locale <locale> --include-fallback --fallback-locale <fallback-locale>',
  '',
];

module.exports = ExportToCsvCommand;
