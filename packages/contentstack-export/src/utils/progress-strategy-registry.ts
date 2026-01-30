import { MODULE_CONTEXTS, MODULE_NAMES, PROCESS_NAMES } from './constants';
/**
 * Progress Strategy Registrations for Export Modules
 * This file registers progress calculation strategies for all export modules
 * to ensure correct item counts in the final summary.
 */

import {
  ProgressStrategyRegistry,
  PrimaryProcessStrategy,
  CustomProgressStrategy,
  DefaultProgressStrategy,
} from '@contentstack/cli-utilities';

// Wrap all registrations in try-catch to prevent module loading errors
try {
  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.CONTENT_TYPES], new DefaultProgressStrategy());

  // Register strategy for Assets - custom strategy to avoid double counting
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.ASSETS],
    new CustomProgressStrategy((processes) => {
      // Both ASSET_METADATA and ASSET_DOWNLOADS represent the same assets
      // Count only the downloads process to avoid double counting in summary
      const downloadsProcess = processes.get(PROCESS_NAMES.ASSET_DOWNLOADS);
      if (downloadsProcess) {
        return {
          total: downloadsProcess.total,
          success: downloadsProcess.successCount,
          failures: downloadsProcess.failureCount,
        };
      }

      // Fallback to metadata process if downloads don't exist
      const metadataProcess = processes.get(PROCESS_NAMES.ASSET_METADATA);
      if (metadataProcess) {
        return {
          total: metadataProcess.total,
          success: metadataProcess.successCount,
          failures: metadataProcess.failureCount,
        };
      }

      return null; // Fall back to default aggregation
    }),
  );

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.GLOBAL_FIELDS], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.EXTENSIONS], new DefaultProgressStrategy());

  // Register strategy for Environments - simple module
  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.ENVIRONMENTS], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.LOCALES], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.LABELS], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.WEBHOOKS], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.WORKFLOWS], new DefaultProgressStrategy());

  ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.CUSTOM_ROLES], new DefaultProgressStrategy());

  // Register strategy for Taxonomies - use Taxonomies & Terms as primary process
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.TAXONOMIES],
    new PrimaryProcessStrategy(PROCESS_NAMES.EXPORT_TAXONOMIES_TERMS),
  );

  // Register strategy for Marketplace Apps - complex module with app installations
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.MARKETPLACE_APPS],
    new CustomProgressStrategy((processes) => {
      // For marketplace apps, count the actual apps exported
      const appsExport = processes.get(PROCESS_NAMES.FETCH_APPS);
      if (appsExport) {
        return {
          total: appsExport.total,
          success: appsExport.successCount,
          failures: appsExport.failureCount,
        };
      }

      const setup = processes.get(PROCESS_NAMES.FETCH_CONFIG_MANIFEST);
      if (setup) {
        return {
          total: setup.total,
          success: setup.successCount,
          failures: setup.failureCount,
        };
      }

      return null;
    }),
  );

  // Register strategy for Stack Settings - use Settings as primary process
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.STACK],
    new PrimaryProcessStrategy(PROCESS_NAMES.STACK_SETTINGS),
  );

  // Register strategy for Personalize - complex module with projects/experiences
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.PERSONALIZE],
    new CustomProgressStrategy((processes) => {
      // For personalize, we want to count projects as the main metric
      const projectExport = processes.get(PROCESS_NAMES.PERSONALIZE_PROJECTS);
      if (projectExport) {
        return {
          total: projectExport.total,
          success: projectExport.successCount,
          failures: projectExport.failureCount,
        };
      }

      // Fallback to any other main process
      const mainProcess = Array.from(processes.values())[0];
      if (mainProcess) {
        return {
          total: mainProcess.total,
          success: mainProcess.successCount,
          failures: mainProcess.failureCount,
        };
      }

      return null;
    }),
  );

  // Register strategy for Entries - use Entries as primary process
  ProgressStrategyRegistry.register(
    MODULE_NAMES[MODULE_CONTEXTS.ENTRIES],
    new PrimaryProcessStrategy(PROCESS_NAMES.ENTRIES),
  );
} catch (error) {
  // Silently ignore registration errors during module loading
}

export default ProgressStrategyRegistry;
