/**
 * Progress Strategy Registrations for Export Modules
 * This file registers progress calculation strategies for all export modules
 * to ensure correct item counts in the final summary.
 */

import { 
  ProgressStrategyRegistry, 
  PrimaryProcessStrategy, 
  CustomProgressStrategy,
  DefaultProgressStrategy 
} from '@contentstack/cli-utilities';

// Register strategy for Content Types - simple module
ProgressStrategyRegistry.register(
  'CONTENT TYPES',
  new DefaultProgressStrategy() 
);

// Register strategy for Assets - use Asset Metadata as primary process  
ProgressStrategyRegistry.register(
  'ASSETS',
  new PrimaryProcessStrategy('Metadata')
);

// Register strategy for Global Fields - simple module
ProgressStrategyRegistry.register(
  'GLOBAL FIELDS',
  new DefaultProgressStrategy()
);

// Register strategy for Extensions - simple module
ProgressStrategyRegistry.register(
  'EXTENSIONS',
  new DefaultProgressStrategy()
);

// Register strategy for Environments - simple module
ProgressStrategyRegistry.register(
  'ENVIRONMENTS',
  new DefaultProgressStrategy()
);

// Register strategy for Locales - simple module
ProgressStrategyRegistry.register(
  'LOCALES',
  new DefaultProgressStrategy()
);

// Register strategy for Labels - simple module
ProgressStrategyRegistry.register(
  'LABELS',
  new DefaultProgressStrategy()
);

// Register strategy for Webhooks - simple module
ProgressStrategyRegistry.register(
  'WEBHOOKS',
  new DefaultProgressStrategy()
);

// Register strategy for Workflows - simple module
ProgressStrategyRegistry.register(
  'WORKFLOWS',
  new DefaultProgressStrategy()
);

// Register strategy for Custom Roles - simple module
ProgressStrategyRegistry.register(
  'CUSTOM ROLES',
  new DefaultProgressStrategy()
);

// Register strategy for Taxonomies - use Taxonomies & Terms as primary process
ProgressStrategyRegistry.register(
  'TAXONOMIES',
  new PrimaryProcessStrategy('Taxonomies & Terms')
);

// Register strategy for Marketplace Apps - complex module with app installations
ProgressStrategyRegistry.register(
  'MARKETPLACE APPS',
  new CustomProgressStrategy((processes) => {
    // For marketplace apps, count the actual apps exported
    const appsExport = processes.get('Fetch');
    if (appsExport) {
      return {
        total: appsExport.total,
        success: appsExport.successCount,
        failures: appsExport.failureCount
      };
    }
    
    // Fallback to setup process if no export process
    const setup = processes.get('Setup');
    if (setup) {
      return {
        total: setup.total,
        success: setup.successCount,
        failures: setup.failureCount
      };
    }
    
    return null;
  })
);

// Register strategy for Stack Settings - use Settings as primary process
ProgressStrategyRegistry.register(
  'STACK',
  new PrimaryProcessStrategy('Settings')
);

// Register strategy for Personalize - complex module with projects/experiences
ProgressStrategyRegistry.register(
  'PERSONALIZE',
  new CustomProgressStrategy((processes) => {
    // For personalize, we want to count projects as the main metric
    const projectExport = processes.get('Project Export');
    if (projectExport) {
      return {
        total: projectExport.total,
        success: projectExport.successCount,
        failures: projectExport.failureCount
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

export default ProgressStrategyRegistry; 