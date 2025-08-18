/**
 * Progress Strategy Registrations for Import Modules
 * This file registers progress calculation strategies for all import modules
 * to ensure correct item counts in the final summary.
 */

import { 
  ProgressStrategyRegistry, 
  PrimaryProcessStrategy, 
  CustomProgressStrategy,
  DefaultProgressStrategy 
} from '@contentstack/cli-utilities';

// Register strategy for Content Types - use Create as primary process
ProgressStrategyRegistry.register(
  'CONTENT TYPES',
  new PrimaryProcessStrategy('Create')
);

// Register strategy for Assets - use Asset Upload as primary process  
ProgressStrategyRegistry.register(
  'ASSETS',
  new PrimaryProcessStrategy('Asset Upload')
);

// Register strategy for Entries - use Entry Creation as primary process
ProgressStrategyRegistry.register(
  'ENTRIES',
  new PrimaryProcessStrategy('Entry Creation')
);

// Register strategy for Global Fields - use Create as primary process
ProgressStrategyRegistry.register(
  'GLOBAL FIELDS',
  new PrimaryProcessStrategy('Create')
);

// Register strategy for Extensions - simple module
ProgressStrategyRegistry.register(
  'EXTENSIONS',
  new PrimaryProcessStrategy('Create')
);

// Register strategy for Environments - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'ENVIRONMENTS',
  new DefaultProgressStrategy()
);

// Register strategy for Locales - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'LOCALES',
  new DefaultProgressStrategy()
);

// Register strategy for Labels - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'LABELS',
  new DefaultProgressStrategy()
);

// Register strategy for Webhooks - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'WEBHOOKS',
  new DefaultProgressStrategy()
);

// Register strategy for Workflows - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'WORKFLOWS',
  new DefaultProgressStrategy()
);

// Register strategy for Custom Roles - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'CUSTOM ROLES',
  new DefaultProgressStrategy()
);

// Register strategy for Taxonomies - uses default (no nested progress yet)
ProgressStrategyRegistry.register(
  'TAXONOMIES',
  new DefaultProgressStrategy()
);

// Register strategy for Marketplace Apps - complex module with app installations
ProgressStrategyRegistry.register(
  'MARKETPLACE APPS',
  new PrimaryProcessStrategy('Apps Installation')
);

// Register strategy for Stack Settings - simple module
ProgressStrategyRegistry.register(
  'STACK SETTINGS',
  new DefaultProgressStrategy()
);

// Register strategy for Personalize - complex module with projects/experiences
ProgressStrategyRegistry.register(
  'PERSONALIZE',
  new CustomProgressStrategy((processes) => {
    // For personalize import, count project imports as primary metric
    const projectImport = processes.get('Project Import');
    if (projectImport) {
      return {
        total: projectImport.total,
        success: projectImport.successCount,
        failures: projectImport.failureCount
      };
    }
    
    // Fallback to any other main process
    const mainProcess = Array.from(processes.values())[0];
    if (mainProcess) {
      return {
        total: mainProcess.total,
        success: mainProcess.successCount,
        failures: mainProcess.failureCount
      };
    }
    
    return null;
  })
);

// Register strategy for Variant Entries - sub-process of entries
ProgressStrategyRegistry.register(
  'VARIANT ENTRIES',
  new DefaultProgressStrategy() // Uses default since it's a sub-process
);

export default ProgressStrategyRegistry; 