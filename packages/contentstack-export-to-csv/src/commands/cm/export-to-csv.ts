/**
 * Export to CSV command.
 * Migrated from: packages/contentstack-export-to-csv/src/commands/cm/export-to-csv.js
 */

import {
  configHandler,
  managementSDKClient,
  flags,
  isAuthenticated,
  cliux,
  doesBranchExist,
  isManagementTokenValid,
  FlagInput,
  log,
  handleAndLogError,
  ux,
} from '@contentstack/cli-utilities';

import config from '../../config';
import { BaseCommand } from '../../base-command';
import {
  startupQuestions,
  chooseOrganization,
  chooseStack,
  chooseBranch,
  chooseLanguage,
  chooseInMemContentTypes,
  getContentTypeCount,
  getContentTypes,
  getEnvironments,
  getEntriesCount,
  getEntries,
  cleanEntries,
  write,
  getOrgUsers,
  getOrgRoles,
  getMappedUsers,
  getMappedRoles,
  cleanOrgUsers,
  kebabize,
  exportTeams,
  getAllTaxonomies,
  getTaxonomy,
  createImportableCSV,
} from '../../utils';
import type {
  ManagementClient,
  StackClient,
  StackDetails,
  StackInitOptions,
  OrganizationChoice,
  StackChoice,
  LanguageChoice,
  Branch,
  FlattenedEntryRow,
  ExportToCsvFlags,
  Taxonomy,
  TaxonomyPayload,
  TaxonomyLocaleOptions,
  EnvironmentMap,
} from '../../types';

/**
 * Token configuration from config handler.
 */
interface TokenConfig {
  apiKey: string;
  token: string;
}

/**
 * Tokens map from config handler.
 */
interface TokensMap {
  [alias: string]: TokenConfig;
}

/**
 * Branch existence check result.
 */
interface BranchExistsResult {
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Content type item from API.
 */
interface ContentTypeItem {
  uid: string;
}

export default class ExportToCsvCommand extends BaseCommand {
  static readonly description = 'Export entries, taxonomies, terms or organization users to csv using this command';

  static readonly aliases = ['cm:export-to-csv'];

  static readonly examples = [
    '$ <%= config.bin %> <%= command.id %>',
    '',
    'Exporting entries to CSV',
    '$ <%= config.bin %> <%= command.id %> --action entries --locale <locale> --alias <management-token-alias> --content-type <content-type>',
    '',
    'Exporting entries to CSV with stack name and branch',
    '$ <%= config.bin %> <%= command.id %> --action entries --locale <locale> --alias <management-token-alias> --content-type <content-type> --stack-name <stack-name> --branch <branch-name>',
    '',
    'Exporting organization users to CSV',
    '$ <%= config.bin %> <%= command.id %> --action users --org <org-uid>',
    '',
    'Exporting organization teams to CSV',
    '$ <%= config.bin %> <%= command.id %> --action teams --org <org-uid>',
    '',
    'Exporting teams with specific team UID',
    '$ <%= config.bin %> <%= command.id %> --action teams --org <org-uid> --team-uid <team-uid>',
    '',
    'Exporting taxonomies to CSV',
    '$ <%= config.bin %> <%= command.id %> --action taxonomies --alias <management-token-alias>',
    '',
    'Exporting specific taxonomy with locale',
    '$ <%= config.bin %> <%= command.id %> --action taxonomies --alias <management-token-alias> --taxonomy-uid <taxonomy-uid> --locale <locale>',
    '',
    'Exporting taxonomies with fallback locale',
    '$ <%= config.bin %> <%= command.id %> --action taxonomies --alias <management-token-alias> --locale <locale> --include-fallback --fallback-locale <fallback-locale>',
  ];

  static readonly flags: FlagInput = {
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

  async run(): Promise<void> {
    log.debug('ExportToCsvCommand run started', this.commandContext);

    try {
      let action: string;
      let managementAPIClient: ManagementClient;

      const { flags: parsedFlags } = await this.parse(ExportToCsvCommand);
      log.debug('Flags parsed', { ...this.commandContext, flags: parsedFlags });

      const flagsData = parsedFlags as ExportToCsvFlags;
      const org = flagsData.org;
      const actionFlag = flagsData.action;
      const orgName = flagsData['org-name'];
      const stackName = flagsData['stack-name'];
      const stackAPIKey = flagsData['stack-api-key'];
      const locale = flagsData.locale;
      const contentTypesFlag = flagsData['content-type'];
      const managementTokenAlias = flagsData.alias;
      const branchUid = flagsData.branch;
      const teamUid = flagsData['team-uid'];
      const taxonomyUID = flagsData['taxonomy-uid'];
      const includeFallback = flagsData['include-fallback'] ?? false;
      const fallbackLocale = flagsData['fallback-locale'];
      const delimiter = flagsData.delimiter ?? ',';

      if (!managementTokenAlias) {
        log.debug('Initializing Management API client', this.commandContext);
        managementAPIClient = await managementSDKClient({ host: this.cmaHost }) as ManagementClient;
        log.debug('Management API client initialized', this.commandContext);

        if (!isAuthenticated()) {
          log.debug('User not authenticated', this.commandContext);
          this.error(config.CLI_EXPORT_CSV_ENTRIES_ERROR, {
            exit: 2,
            suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
          });
        }
      }

      if (actionFlag) {
        action = actionFlag;
        log.debug(`Action provided via flag: ${action}`, this.commandContext);
      } else {
        action = await startupQuestions();
        log.debug(`Action selected interactively: ${action}`, this.commandContext);
      }

      switch (action) {
        case config.exportEntries:
        case 'entries': {
          await this.exportEntries({
            managementAPIClient: managementAPIClient!,
            managementTokenAlias,
            stackName,
            stackAPIKey,
            org,
            branchUid,
            locale,
            contentTypesFlag,
            delimiter,
          });
          break;
        }

        case config.exportUsers:
        case 'users': {
          await this.exportUsers({
            managementAPIClient: managementAPIClient!,
            org,
            orgName,
            action,
            delimiter,
          });
          break;
        }

        case config.exportTeams:
        case 'teams': {
          await this.exportTeamsData({
            managementAPIClient: managementAPIClient!,
            org,
            orgName,
            action,
            teamUid,
            delimiter,
          });
          break;
        }

        case config.exportTaxonomies:
        case 'taxonomies': {
          await this.exportTaxonomiesData({
            managementAPIClient: managementAPIClient!,
            managementTokenAlias,
            stackName,
            stackAPIKey,
            org,
            locale,
            branchUid,
            taxonomyUID,
            includeFallback,
            fallbackLocale,
            delimiter,
          });
          break;
        }
      }

      log.success('Export completed successfully', this.commandContext);
    } catch (error) {
      log.debug('Export failed', { ...this.commandContext, error });
      handleAndLogError(error, this.commandContext);
      ux.action.stop('Export failed');
      this.exit(1);
    }
  }

  /**
   * Export entries to CSV.
   */
  private async exportEntries(options: {
    managementAPIClient: ManagementClient;
    managementTokenAlias?: string;
    stackName?: string;
    stackAPIKey?: string;
    org?: string;
    branchUid?: string;
    locale?: string;
    contentTypesFlag?: string;
    delimiter: string;
  }): Promise<void> {
    const {
      managementAPIClient,
      managementTokenAlias,
      stackName,
      stackAPIKey,
      org,
      branchUid,
      locale,
      contentTypesFlag,
      delimiter,
    } = options;

    log.debug('Starting entries export', this.commandContext);

    try {
      let stack: StackDetails;
      let stackAPIClient: StackClient;
      let language: LanguageChoice;
      let contentTypes: string[] = [];
      let apiClient = managementAPIClient;

      if (managementTokenAlias) {
        log.debug(`Using management token alias: ${managementTokenAlias}`, this.commandContext);
        const { stackDetails, apiClient: client } = await this.getAliasDetails(managementTokenAlias, stackName);
        apiClient = client;
        stack = stackDetails;
      } else {
        stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
      }

      // Update context with stack API key
      this.commandContext.apiKey = stack.apiKey;
      log.debug(`Stack selected: ${stack.name}`, this.commandContext);

      stackAPIClient = this.getStackClient(apiClient, stack);
      stackAPIClient = await this.checkAndUpdateBranchDetail(branchUid, stack, stackAPIClient, apiClient);

      cliux.loader('Fetching content types...');
      const contentTypeCount = await getContentTypeCount(stackAPIClient);
      const environments: EnvironmentMap = await getEnvironments(stackAPIClient);
      cliux.loader('Content types fetched');

      log.debug(`Found ${contentTypeCount} content types`, this.commandContext);

      if (contentTypesFlag) {
        contentTypes = contentTypesFlag.split(',').map(this.snakeCase);
        log.debug(`Content types from flag: ${contentTypes.join(', ')}`, this.commandContext);

        const contentTypesResponse = await stackAPIClient
          .contentType()
          .query()
          .find() as { items: ContentTypeItem[] };
        const contentTypesArray = contentTypesResponse.items.map((ct) => ct.uid);

        const doesContentTypeExist = contentTypesArray.includes(contentTypesFlag);
        if (!doesContentTypeExist) {
          throw new Error(
            `The Content Type ${contentTypesFlag} was not found. Please try again. Content Type is not valid.`,
          );
        }
      } else {
        for (let index = 0; index <= contentTypeCount / 100; index++) {
          const contentTypesMap = await getContentTypes(stackAPIClient, index);
          contentTypes = contentTypes.concat(Object.values(contentTypesMap));
        }
      }

      if (contentTypes.length <= 0) {
        cliux.print('No content types found for the given stack', { color: 'yellow' });
        log.info('No content types found', this.commandContext);
        return;
      }

      if (!contentTypesFlag) {
        contentTypes = await chooseInMemContentTypes(contentTypes);
        log.debug(`Content types selected: ${contentTypes.join(', ')}`, this.commandContext);
      }

      if (locale) {
        language = { code: locale };
      } else {
        language = await chooseLanguage(stackAPIClient);
      }
      log.debug(`Locale: ${language.code}`, this.commandContext);

      while (contentTypes.length > 0) {
        const contentType = contentTypes.pop()!;
        log.debug(`Processing content type: ${contentType}`, this.commandContext);

        cliux.loader(`Fetching entries for ${contentType}...`);
        const entriesCount = await getEntriesCount(stackAPIClient, contentType, language.code);
        let flatEntries: FlattenedEntryRow[] = [];

        for (let index = 0; index < entriesCount / 100; index++) {
          const entriesResult = await getEntries(stackAPIClient, contentType, language.code, index, 100);
          const flatEntriesResult = cleanEntries(entriesResult.items, language.code, environments, contentType);
          flatEntries = flatEntries.concat(flatEntriesResult);
        }
        cliux.loader();

        log.info(`Exporting ${flatEntries.length} entries for ${contentType}`, this.commandContext);
        const fileName = `${stackName || stack.name}_${contentType}_${language.code}_entries_export.csv`;
        write(this, flatEntries, fileName, 'entries', delimiter);
      }

      log.success('Entries exported successfully', this.commandContext);
    } catch (error) {
      log.debug('Entries export failed', { ...this.commandContext, error });
      handleAndLogError(error, this.commandContext, 'Failed to export entries');
      throw error;
    }
  }

  /**
   * Export organization users to CSV.
   */
  private async exportUsers(options: {
    managementAPIClient: ManagementClient;
    org?: string;
    orgName?: string;
    action: string;
    delimiter: string;
  }): Promise<void> {
    const { managementAPIClient, org, orgName, action, delimiter } = options;

    log.debug('Starting users export', this.commandContext);

    try {
      let organization: OrganizationChoice;

      if (org) {
        organization = { uid: org, name: orgName || org };
        log.debug(`Organization from flag: ${organization.name}`, this.commandContext);
      } else {
        organization = await chooseOrganization(managementAPIClient, action);
        log.debug(`Organization selected: ${organization.name}`, this.commandContext);
      }

      // Update context with org ID
      this.commandContext.orgId = organization.uid;

      cliux.loader('Fetching organization users...');
      const orgUsers = await getOrgUsers(managementAPIClient, organization.uid);
      const orgRoles = await getOrgRoles(managementAPIClient, organization.uid);
      cliux.loader();

      const mappedUsers = getMappedUsers(orgUsers);
      const mappedRoles = getMappedRoles(orgRoles);
      const listOfUsers = cleanOrgUsers(orgUsers, mappedUsers, mappedRoles);

      log.info(`Exporting ${listOfUsers.length} users`, this.commandContext);

      const fileName = `${kebabize(
        (orgName || organization.name).replace(config.organizationNameRegex, ''),
      )}_users_export.csv`;

      write(this, listOfUsers, fileName, 'organization details', delimiter);
      log.success('Users exported successfully', this.commandContext);
    } catch (error) {
      log.debug('Users export failed', { ...this.commandContext, error });
      handleAndLogError(error, this.commandContext, 'Failed to export users');
      throw error;
    }
  }

  /**
   * Export organization teams to CSV.
   */
  private async exportTeamsData(options: {
    managementAPIClient: ManagementClient;
    org?: string;
    orgName?: string;
    action: string;
    teamUid?: string;
    delimiter: string;
  }): Promise<void> {
    const { managementAPIClient, org, orgName, action, teamUid, delimiter } = options;

    log.debug('Starting teams export', this.commandContext);

    try {
      let organization: OrganizationChoice;

      if (org) {
        organization = { uid: org, name: orgName || org };
        log.debug(`Organization from flag: ${organization.name}`, this.commandContext);
      } else {
        organization = await chooseOrganization(managementAPIClient, action);
        log.debug(`Organization selected: ${organization.name}`, this.commandContext);
      }

      // Update context with org ID
      this.commandContext.orgId = organization.uid;

      await exportTeams(managementAPIClient, organization, teamUid, delimiter);
      log.success('Teams exported successfully', this.commandContext);
    } catch (error) {
      log.debug('Teams export failed', { ...this.commandContext, error });
      handleAndLogError(error, this.commandContext, 'Failed to export teams');
      throw error;
    }
  }

  /**
   * Export taxonomies to CSV.
   */
  private async exportTaxonomiesData(options: {
    managementAPIClient: ManagementClient;
    managementTokenAlias?: string;
    stackName?: string;
    stackAPIKey?: string;
    org?: string;
    locale?: string;
    branchUid?: string;
    taxonomyUID?: string;
    includeFallback: boolean;
    fallbackLocale?: string;
    delimiter: string;
  }): Promise<void> {
    const {
      managementAPIClient,
      managementTokenAlias,
      stackName,
      stackAPIKey,
      org,
      locale,
      branchUid,
      taxonomyUID,
      includeFallback,
      fallbackLocale,
      delimiter,
    } = options;

    log.debug('Starting taxonomies export', this.commandContext);

    try {
      let stack: StackDetails;
      let language: LanguageChoice;
      let stackAPIClient: StackClient;
      let apiClient = managementAPIClient;

      if (managementTokenAlias) {
        log.debug(`Using management token alias: ${managementTokenAlias}`, this.commandContext);
        const { stackDetails, apiClient: client } = await this.getAliasDetails(managementTokenAlias, stackName);
        apiClient = client;
        stack = stackDetails;
      } else {
        stack = await this.getStackDetails(managementAPIClient, stackAPIKey, org);
      }

      // Update context with stack API key
      this.commandContext.apiKey = stack.apiKey;
      log.debug(`Stack selected: ${stack.name}`, this.commandContext);

      stackAPIClient = this.getStackClient(apiClient, stack);

      if (locale) {
        language = { code: locale };
      } else {
        language = await chooseLanguage(stackAPIClient);
      }
      log.debug(`Locale: ${language.code}`, this.commandContext);

      await this.createTaxonomyAndTermCsvFile(stackAPIClient, stackName, stack, taxonomyUID, delimiter, {
        locale: language.code,
        branch: branchUid,
        include_fallback: includeFallback,
        fallback_locale: fallbackLocale,
      });

      log.success('Taxonomies exported successfully', this.commandContext);
    } catch (error) {
      log.debug('Taxonomies export failed', { ...this.commandContext, error });
      handleAndLogError(error, this.commandContext, 'Failed to export taxonomies');
      throw error;
    }
  }

  snakeCase(string: string): string {
    return (string || '').split(' ').join('_').toLowerCase();
  }

  getStackClient(managementAPIClient: ManagementClient, stack: StackDetails): StackClient {
    const stackInit: StackInitOptions = {
      api_key: stack.apiKey,
    };

    if (stack?.branch_uid) {
      stackInit.branch_uid = stack.branch_uid;
    }

    if (stack.token) {
      return managementAPIClient.stack({
        ...stackInit,
        management_token: stack.token,
      });
    }

    return managementAPIClient.stack(stackInit);
  }

  getStackBranches(stackAPIClient: StackClient): Promise<Branch[]> {
    return stackAPIClient
      .branch()
      .query()
      .find()
      .then(({ items }: { items?: Branch[] }) => (items !== undefined ? items : []))
      .catch(() => []);
  }

  /**
   * Check whether branch enabled org or not and update branch details.
   */
  async checkAndUpdateBranchDetail(
    branchUid: string | undefined,
    stack: StackDetails,
    stackAPIClient: StackClient,
    managementAPIClient: ManagementClient,
  ): Promise<StackClient> {
    if (branchUid) {
      log.debug(`Checking branch: ${branchUid}`, this.commandContext);
      try {
        const branchExists = await doesBranchExist(stackAPIClient, branchUid) as BranchExistsResult;
        if (branchExists?.errorCode) {
          throw new Error(branchExists.errorMessage);
        }
        stack.branch_uid = branchUid;
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
        log.debug(`Branch validated: ${branchUid}`, this.commandContext);
      } catch (error) {
        log.debug('Branch validation failed', { ...this.commandContext, error });
        handleAndLogError(error, this.commandContext, 'Invalid branch');
        this.exit(1);
      }
    } else {
      const stackBranches = await this.getStackBranches(stackAPIClient);
      if (stackBranches === undefined || stackBranches.length === 0) {
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
      } else {
        const { branch } = await chooseBranch(stackBranches);
        stack.branch_uid = branch;
        stackAPIClient = this.getStackClient(managementAPIClient, stack);
        log.debug(`Branch selected: ${branch}`, this.commandContext);
      }
    }
    return stackAPIClient;
  }

  /**
   * Fetch stack details from alias token.
   */
  async getAliasDetails(
    managementTokenAlias: string,
    stackName: string | undefined,
  ): Promise<{ apiClient: ManagementClient; stackDetails: StackDetails }> {
    log.debug(`Resolving alias: ${managementTokenAlias}`, this.commandContext);

    const listOfTokens = configHandler.get('tokens') as TokensMap | undefined;

    if (managementTokenAlias && listOfTokens?.[managementTokenAlias]) {
      const tokenConfig = listOfTokens[managementTokenAlias];

      cliux.loader('Validating management token...');
      const checkManagementTokenValidity = await isManagementTokenValid(
        tokenConfig.apiKey,
        tokenConfig.token,
      ) as { valid?: string; message?: string };
      cliux.loader();

      if (Object.prototype.hasOwnProperty.call(checkManagementTokenValidity, 'message')) {
        const errorMsg = checkManagementTokenValidity.valid === 'failedToCheck'
          ? checkManagementTokenValidity.message
          : `Management token or stack API key is invalid. ${checkManagementTokenValidity.message}`;
        log.debug('Token validation failed', { ...this.commandContext, error: errorMsg });
        throw new Error(errorMsg);
      }

      log.debug('Token validated successfully', this.commandContext);

      const apiClient = await managementSDKClient({
        host: this.cmaHost,
        management_token: tokenConfig.token,
      }) as ManagementClient;

      const stackDetails: StackDetails = {
        name: stackName || managementTokenAlias,
        apiKey: tokenConfig.apiKey,
        token: tokenConfig.token,
      };

      return { apiClient, stackDetails };
    } else if (managementTokenAlias) {
      log.debug('Alias not found in config', this.commandContext);
      this.error('The provided management token alias was not found in your config.', {
        exit: 1,
        suggestions: ['Use "csdx auth:tokens:add" to add a new token'],
      });
    }

    throw new Error('Management token alias is required.');
  }

  /**
   * Fetch stack details on basis of the selected org and stack.
   */
  async getStackDetails(
    managementAPIClient: ManagementClient,
    stackAPIKey: string | undefined,
    org: string | undefined,
  ): Promise<StackDetails> {
    log.debug('Getting stack details', this.commandContext);

    if (!isAuthenticated()) {
      log.debug('User not authenticated', this.commandContext);
      this.error(config.CLI_EXPORT_CSV_ENTRIES_ERROR, {
        exit: 2,
        suggestions: ['https://www.contentstack.com/docs/developers/cli/authentication/'],
      });
    }

    let organization: OrganizationChoice;
    let stackDetails: StackChoice;

    if (org) {
      organization = { uid: org, name: org };
    } else {
      organization = await chooseOrganization(managementAPIClient);
    }
    log.debug(`Organization: ${organization.name}`, this.commandContext);

    if (!stackAPIKey) {
      stackDetails = await chooseStack(managementAPIClient, organization.uid);
    } else {
      stackDetails = await chooseStack(managementAPIClient, organization.uid, stackAPIKey);
    }
    log.debug(`Stack: ${stackDetails.name}`, this.commandContext);

    return {
      name: stackDetails.name,
      apiKey: stackDetails.apiKey,
    };
  }

  /**
   * Create a taxonomies csv file for stack and a terms csv file for associated taxonomies.
   */
  async createTaxonomyAndTermCsvFile(
    stackAPIClient: StackClient,
    stackName: string | undefined,
    stack: StackDetails,
    taxUID: string | undefined,
    delimiter: string,
    localeOptions: TaxonomyLocaleOptions = {},
  ): Promise<void> {
    log.debug('Creating taxonomy CSV', this.commandContext);

    const payload: TaxonomyPayload = {
      stackAPIClient,
      limit: config.limit || 100,
      ...localeOptions,
    };

    let taxonomies: Taxonomy[] = [];

    cliux.loader('Fetching taxonomies...');
    if (taxUID) {
      payload.taxonomyUID = taxUID;
      const taxonomy = await getTaxonomy(payload);
      taxonomies.push(taxonomy);
      log.debug(`Single taxonomy fetched: ${taxUID}`, this.commandContext);
    } else {
      taxonomies = await getAllTaxonomies(payload);
      log.debug(`Fetched ${taxonomies.length} taxonomies`, this.commandContext);
    }
    cliux.loader();

    if (!taxonomies?.length) {
      cliux.print('No taxonomies found!', { color: 'yellow' });
      log.info('No taxonomies found', this.commandContext);
      return;
    }

    cliux.loader('Generating CSV...');
    const fileName = `${stackName ?? stack.name}_taxonomies.csv`;
    const { taxonomiesData, headers } = await createImportableCSV(payload, taxonomies);
    cliux.loader();

    if (taxonomiesData?.length) {
      log.info(`Exporting ${taxonomiesData.length} taxonomy records`, this.commandContext);
      write(this, taxonomiesData, fileName, 'taxonomies', delimiter, headers);
    }
  }
}
