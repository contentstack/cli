import { CloneContext } from './clone-context';

/**
 * Clone configuration interface
 */
export interface CloneConfig {
  // Context
  cloneContext?: CloneContext;
  
  // Source stack configuration
  source_stack?: string;
  sourceStackName?: string;
  sourceOrg?: string;
  sourceStackBranch?: string;
  sourceStackBranchAlias?: string;
  source_alias?: string;
  
  // Target stack configuration
  target_stack?: string;
  destinationStackName?: string;
  targetOrg?: string;
  targetStackBranch?: string;
  targetStackBranchAlias?: string;
  destination_alias?: string;
  
  // Clone type and options
  cloneType?: 'a' | 'b';
  stackName?: string;
  importWebhookStatus?: 'disable' | 'current';
  skipAudit?: boolean;
  forceStopMarketplaceAppsPrompt?: boolean;
  
  // Data and modules
  data?: string;
  modules?: string[];
  filteredModules?: string[];
  
  // Paths
  pathDir?: string;
  
  // Authentication
  auth_token?: string;
  management_token?: string;
  
  // Host configuration
  host?: string;
  cdn?: string;
  
  // External config support
  export?: Record<string, any>;
  import?: Record<string, any>;
  
  // Additional properties (for flexibility with external configs)
  [key: string]: any;
}
