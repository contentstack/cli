import * as path from 'path';
import { log } from '@contentstack/cli-utilities';

import defaultConfig from '../config';
import { ImportConfig } from '../types';
import { askBranchSelection } from './interactive';
import { fileExistsSync, readFile } from './file-helper';

/**
 * Selects a branch from directory structure when multiple branches are found
 * @param contentDir - The content directory path
 * @returns Promise<{ branchPath: string } | null>
 */
export const selectBranchFromDirectory = async (contentDir: string): Promise<{ branchPath: string } | null> => {
  log.debug('Selecting branch directory from directory structure');

  const branchesJsonPath = path.join(contentDir, 'branches.json');
  if (!fileExistsSync(branchesJsonPath)) {
    log.debug('No branches.json found - not a branch-enabled export');
    return null;
  }

  try {
    const branchesData = await readFile(branchesJsonPath);
    const branches = branchesData || [];

    if (!branches || !Array.isArray(branches) || branches.length === 0) {
      log.debug('No branches found in branches.json - not a branch-enabled export');
      return null;
    }

    if (branches.length === 1) {
      const singleBranch = branches[0];
      const branchPath = path.join(contentDir, singleBranch.uid);

      if (!fileExistsSync(branchPath)) {
        log.warn(`Branch path does not exist: ${branchPath}, not a valid branch export`);
        return null;
      }

      log.debug(`Single branch detected: ${singleBranch.uid} - auto-resolving to: ${branchPath}`);
      return { branchPath };
    } else {
      log.debug(`Multiple branches detected: ${branches.map((b) => b.uid).join(', ')}`);

      const branchNames = branches.map((b) => b.uid);
      const selectedBranch = await askBranchSelection(branchNames);
      const selectedBranchPath = path.join(contentDir, selectedBranch);

      if (!fileExistsSync(selectedBranchPath)) {
        log.warn(`Selected branch path does not exist: ${selectedBranchPath}, not a valid branch export`);
        return null;
      }

      log.debug(`User selected branch directory: ${selectedBranch} - using path: ${selectedBranchPath}`);
      return { branchPath: selectedBranchPath };
    }
  } catch (error) {
    log.error(`Error selecting branch directory from directory structure: ${error}`);
    throw error;
  }
};

/**
 * Resolves the import path based on directory structure and user configuration
 * @param importConfig - The import configuration object
 * @param stackAPIClient - The Contentstack API client
 * @returns Promise<string> - The resolved path
 */
export const resolveImportPath = async (importConfig: ImportConfig, stackAPIClient: any): Promise<string> => {
  log.debug('Resolving import path based on directory structure');

  const contentDir = importConfig.contentDir || importConfig.data;
  log.debug(`Content directory: ${contentDir}`);

  if (!fileExistsSync(contentDir)) {
    throw new Error(`Content directory does not exist: ${contentDir}`);
  }

  if (importConfig.branchName) {
    log.debug(`User specified branch: ${importConfig.branchName}`);

    const currentDirName = path.basename(contentDir);
    if (currentDirName === importConfig.branchName) {
      log.debug(`Already in correct branch directory: ${contentDir}`);
      return contentDir;
    }

    const branchPath = path.join(contentDir, importConfig.branchName);
    if (fileExistsSync(branchPath)) {
      log.debug(`Navigating to specified branch directory: ${branchPath}`);
      return branchPath;
    }

    log.debug(`Branch directory not found: ${branchPath}, using contentDir as-is`);
    return contentDir;
  }

  const exportInfoPath = path.join(contentDir, 'export-info.json');
  if (fileExistsSync(exportInfoPath)) {
    log.debug('Found export-info.json - using contentDir as-is (v2 export)');
    return contentDir;
  }

  const moduleTypes = defaultConfig.modules.types;
  const hasModuleFolders = moduleTypes.some((moduleType) => fileExistsSync(path.join(contentDir, moduleType)));

  if (hasModuleFolders) {
    log.debug('Found module folders ');
    return contentDir;
  }

  const branchSelection = await selectBranchFromDirectory(contentDir);
  if (branchSelection) {
    return branchSelection.branchPath;
  }

  log.debug('No specific structure detected - using contentDir as-is');
  return contentDir;
};

/**
 * Updates the import configuration with the resolved path
 * @param importConfig - The import configuration object
 * @param resolvedPath - The resolved path
 */
export const updateImportConfigWithResolvedPath = async (
  importConfig: ImportConfig,
  resolvedPath: string,
): Promise<void> => {
  log.debug(`Updating import config with resolved path: ${resolvedPath}`);

  if (!fileExistsSync(resolvedPath)) {
    log.warn(`Resolved path does not exist: ${resolvedPath}, skipping config update`);
    return;
  }

  importConfig.branchDir = resolvedPath;

  importConfig.contentDir = resolvedPath;

  importConfig.data = resolvedPath;

  // Check if export-info.json exists to determine contentVersion
  const exportInfoPath = path.join(resolvedPath, 'export-info.json');
  if (fileExistsSync(exportInfoPath)) {
    try {
      const exportInfo = await readFile(exportInfoPath);
      // If export-info.json exists, set contentVersion to 2 (or use value from file if present)
      if (exportInfo && exportInfo.contentVersion) {
        importConfig.contentVersion = exportInfo.contentVersion;
      } else {
        // If export-info.json exists but contentVersion is missing, default to 2
        importConfig.contentVersion = 2;
      }
    } catch (error) {
      // If export-info.json exists but is null or can't be read, default to 2
      importConfig.contentVersion = 2;
    }
  } else {
    // If export-info.json doesn't exist, default to 1 (legacy format)
    importConfig.contentVersion = 1;
  }

  log.debug(
    `Import config updated - contentDir: ${importConfig.contentDir}, branchDir: ${importConfig.branchDir}, data: ${importConfig.data}, contentVersion: ${importConfig.contentVersion}`,
  );
};

/**
 * Executes the complete import path resolution logic
 * @param importConfig - The import configuration object
 * @param stackAPIClient - The Contentstack API client
 * @returns Promise<string> - The resolved path
 */
export const executeImportPathLogic = async (importConfig: ImportConfig, stackAPIClient: any): Promise<string> => {
  log.debug('Executing import path resolution logic');

  const resolvedPath = await resolveImportPath(importConfig, stackAPIClient);

  await updateImportConfigWithResolvedPath(importConfig, resolvedPath);

  return resolvedPath;
};
