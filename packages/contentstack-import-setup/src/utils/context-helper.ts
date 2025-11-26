import { configHandler } from '@contentstack/cli-utilities';
import { ImportConfig, Modules } from '../types';

/**
 * Initialize context if it doesn't exist and optionally set the module name
 * @param config - ImportConfig instance
 * @param module - Optional module name to set
 * @param commandContext - Optional command context from oclif command
 * @returns {void}
 */
export function initializeContext(
  config: ImportConfig,
  module?: Modules,
  commandContext?: { info?: { command?: string }; sessionId?: string },
): void {
  if (!config.context) {
    config.context = {
      command: commandContext?.info?.command || 'cm:stacks:import-setup',
      module: module || '',
      userId: configHandler.get('userUid') || '',
      email: configHandler.get('email') || '',
      sessionId: commandContext?.sessionId || '',
      apiKey: config.apiKey || '',
      orgId: configHandler.get('oauthOrgUid') || '',
      authenticationMethod: (config as any).authenticationMethod || 'Basic Auth',
    };
  } else if (module) {
    config.context.module = module;
  }
}

