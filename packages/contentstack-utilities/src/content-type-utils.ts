import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve as pResolve } from 'node:path';

/**
 * Reads all content type schema files from a directory
 * @param dirPath - Path to content types directory
 * @param ignoredFiles - Files to ignore (defaults to schema.json, .DS_Store, __master.json, __priority.json)
 * @returns Array of content type schemas (empty if the path is missing or has no eligible files)
 */
export function readContentTypeSchemas(
  dirPath: string,
  ignoredFiles: string[] = ['schema.json', '.DS_Store', '__master.json', '__priority.json', 'field_rules_uid.json'],
): Record<string, unknown>[] {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = readdirSync(dirPath);

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
      const raw = readFileSync(filePath, 'utf8');
      const contentType = JSON.parse(raw) as Record<string, unknown>;
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
