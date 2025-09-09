/**
 * Progress Strategy Registrations for Import Modules
 * This file registers progress calculation strategies for all import modules
 * to ensure correct item counts in the final summary.
 */

import {
  ProgressStrategyRegistry,
  PrimaryProcessStrategy,
  CustomProgressStrategy,
  DefaultProgressStrategy,
} from '@contentstack/cli-utilities';
import { MODULE_CONTEXTS, MODULE_NAMES, PROCESS_NAMES } from './constants';

// Register strategy for Content Types - use Create as primary process
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.CONTENT_TYPES],
  new PrimaryProcessStrategy(PROCESS_NAMES.CONTENT_TYPES_CREATE),
);

// Register strategy for Assets - use Asset Upload as primary process
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.ASSETS],
  new PrimaryProcessStrategy(PROCESS_NAMES.ASSET_UPLOAD),
);

// Register strategy for Entries - use Entry Creation as primary process
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.ENTRIES],
  new PrimaryProcessStrategy(PROCESS_NAMES.ENTRIES_CREATE),
);

// Register strategy for Global Fields - use Create as primary process
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.GLOBAL_FIELDS],
  new PrimaryProcessStrategy(PROCESS_NAMES.GLOBAL_FIELDS_CREATE),
);

// Register strategy for Extensions - simple module
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.EXTENSIONS],
  new PrimaryProcessStrategy(PROCESS_NAMES.EXTENSIONS_CREATE),
);

// Register strategy for Environments - uses default (no nested progress yet)
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.ENVIRONMENTS], new DefaultProgressStrategy());

// Register strategy for Locales - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.LOCALES],
  new PrimaryProcessStrategy(PROCESS_NAMES.LOCALES_CREATE),
);

// Register strategy for Labels - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.LABELS],
  new PrimaryProcessStrategy(PROCESS_NAMES.LABELS_CREATE),
);

// Register strategy for Webhooks - uses default (no nested progress yet)
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.WEBHOOKS], new DefaultProgressStrategy());

// Register strategy for Workflows - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.WORKFLOWS],
  new PrimaryProcessStrategy(PROCESS_NAMES.WEBHOOKS_IMPORT),
);

// Register strategy for Custom Roles - uses default (no nested progress yet)
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.CUSTOM_ROLES], new DefaultProgressStrategy());

// Register strategy for Taxonomies - uses default (no nested progress yet)
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.TAXONOMIES], new DefaultProgressStrategy());

// Register strategy for Marketplace Apps - complex module with app installations
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.MARKETPLACE_APPS],
  new PrimaryProcessStrategy(PROCESS_NAMES.CREATE_APPS),
);

// Register strategy for Stack Settings - simple module
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.STACK], new DefaultProgressStrategy());

// Register strategy for Personalize - complex module with projects/experiences
ProgressStrategyRegistry.register(
  MODULE_NAMES[MODULE_CONTEXTS.PERSONALIZE],
  new CustomProgressStrategy((processes) => {
    // For personalize import, count project imports as primary metric
    const projectImport = processes.get(PROCESS_NAMES.PERSONALIZE_PROJECTS);
    if (projectImport) {
      return {
        total: projectImport.total,
        success: projectImport.successCount,
        failures: projectImport.failureCount,
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

// Register strategy for Variant Entries - sub-process of entries
ProgressStrategyRegistry.register(MODULE_NAMES[MODULE_CONTEXTS.VARIANT_ENTRIES], new DefaultProgressStrategy());

export default ProgressStrategyRegistry;
