import { resolve as pResolve } from 'node:path';
import { FsUtility } from './fs-utility';

/**
 * Reads all content type schema files from a directory
 * @param dirPath - Path to content types directory
 * @param ignoredFiles - Files to ignore (defaults to schema.json, .DS_Store, __master.json, __priority.json)
 * @returns Array of content type schemas
 */
export function readContentTypeSchemas(
  dirPath: string,
  ignoredFiles: string[] = ['schema.json', '.DS_Store', '__master.json', '__priority.json'],
): Record<string, unknown>[] {
  const fsUtil = new FsUtility();
  const files = fsUtil.readdir(dirPath);

  if (!files || files.length === 0) {
    return [];
  }

  const contentTypes: Record<string, unknown>[] = [];

  for (const file of files) {
    // Skip if not a JSON file
    if (!file.endsWith('.json')) {
      continue;
    }

    // Skip ignored files
    if (ignoredFiles.includes(file)) {
      continue;
    }

    try {
      const filePath = pResolve(dirPath, file);
      const contentType = fsUtil.readFile(filePath);
      if (contentType) {
        contentTypes.push(contentType as Record<string, unknown>);
      }
    } catch (error) {
      // Skip files that cannot be parsed
      console.warn(`Failed to read content type file ${file}:`, error);
    }
  }

  return contentTypes;
}
