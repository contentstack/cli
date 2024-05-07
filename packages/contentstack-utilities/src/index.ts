import Logger from './logger';
import marketplaceSDKClient, {
  App,
  AppData,
  Installation,
  MarketplaceSDKInitiator,
  marketplaceSDKInitiator,
  ContentstackMarketplaceClient,
  ContentstackMarketplaceConfig,
} from './contentstack-marketplace-sdk';

export { LoggerService } from './logger';
export { default as cliux } from './cli-ux';
export { default as CLIError } from './cli-error';
export { default as messageHandler } from './message-handler';
export { default as authHandler } from './auth-handler';
export { default as configHandler } from './config-handler';
export {
  default as managementSDKClient,
  managementSDKInitiator,
  ContentstackClient,
  ContentstackConfig,
} from './contentstack-management-sdk';
export { default as printFlagDeprecation } from './flag-deprecation-check';
export * from './http-client';
export * from './fs-utility';
export { default as NodeCrypto } from './encrypter';
export { Args as args, Flags as flags, Command } from './cli-ux';
export * from './helpers';
export * from './interfaces';
export * from './date-time';
export * from './add-locale';
export * from './path-validator';

// Marketplace SDK export
export {
  App,
  AppData,
  Installation,
  marketplaceSDKClient,
  MarketplaceSDKInitiator,
  marketplaceSDKInitiator,
  ContentstackMarketplaceClient,
  ContentstackMarketplaceConfig,
};

// NOTE Exporting all @oclif/core modules: So that all the module can be acessed through cli-utility
export {
  Args,
  CommandHelp,
  Config,
  Errors,
  Flags,
  loadHelpClass,
  Help,
  HelpBase,
  HelpSection,
  HelpSectionRenderer,
  HelpSectionKeyValueTable,
  Hook,
  Interfaces,
  Parser,
  Plugin,
  run,
  toStandardizedId,
  toConfiguredId,
  settings,
  Settings,
  flush,
  ux,
  execute,
  stderr,
  stdout,
} from '@oclif/core';
export { FlagInput, ArgInput, FlagDefinition } from '@oclif/core/lib/interfaces/parser';

export { default as TablePrompt } from './inquirer-table-prompt';

export { Logger };
