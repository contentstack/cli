import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { cliux, log, sanitizePath } from '@contentstack/cli-utilities';
import { BranchDiffVerboseRes, CSVRow, ModifiedFieldsInput } from '../interfaces';

/**
 * Get display name for a field with special handling for system fields
 * @param field - The field object
 * @returns {string} Display name for the field
 */
export function getFieldDisplayName(field: any): string {
  let fieldName = field.displayName || field.display_name || field.title || field.uid;
  
  // Special handling for field_rules
  if (!fieldName && field.path === 'field_rules') {
    fieldName = 'Field Rules';
  } else if (!fieldName) {
    fieldName = 'Unknown Field';
  }
  
  return fieldName;
}

/**
 * Format values for CSV display
 * @param value - The value to format
 * @returns {string} Formatted string value
 */
export function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Empty Array';
  }
  
  if (typeof value === 'object') {
    if (value.title) return value.title;
    if (value.display_name) return value.display_name;
    if (value.uid) return value.uid;
    
    return '[Object]';
  }
  
  return String(value);
}

/**
 * Generate descriptive text for changes (field-level or content type-level)
 * @param changeType - The type of change (added, deleted, modified)
 * @param item - The item object (field or content type)
 * @param itemType - The type of item ('field' or 'contentType')
 * @returns {string} Descriptive text for the change
 */
export function generateChangeDescription(changeType: string, item: any, itemType: 'field' | 'contentType' = 'field'): string {
  const templates = {
    added: {
      contentType: "Content type '{name}' added to stack",
      field: "New {type} field '{name}' added to content type"
    },
    deleted: {
      contentType: "Content type '{name}' removed from stack", 
      field: "{type} field '{name}' removed from content type"
    },
    modified: {
      contentType: "Content type '{name}' has been modified",
      field: "{type} field '{name}' has been modified"
    }
  };
  
  const template = templates[changeType]?.[itemType] || `${changeType}: {name}`;
  
  if (itemType === 'contentType') {
    const name = item.title || item.uid || 'Unknown';
    return template.replace('{name}', name);
  }
  
  // Field-level changes
  const name = getFieldDisplayName(item);
  const type = item.fieldType || item.data_type || item.field || 'field';
  const cleanType = type === 'field' ? 'field' : type;
  
  return template.replace('{name}', name).replace('{type}', cleanType);
}

/**
 * Extract the old value from a diff operation
 * @param diff - The diff object containing change information
 * @param fieldContext - The field context for additional information
 * @returns {string} Formatted old value
 */
export function getOldValueFromDiff(diff: any, fieldContext: any): string {
  if ('from' in diff) return formatValue(diff.from);
  if (fieldContext && diff.path?.length > 0) {
    const contextValue = extractValueFromPath(fieldContext, diff.path);
    return contextValue !== undefined ? formatValue(contextValue) : 'undefined';
  }
  return 'undefined';
}

/**
 * Generate descriptive text for property-level changes in diff operations
 * @param diff - The diff object containing change information
 * @param fieldContext - The field context for additional information
 * @returns {string} Descriptive text for the change
 */
export function generatePropertyChangeDescription(diff: any, fieldContext: any): string {
  const fieldName = fieldContext?.display_name || fieldContext?.title || fieldContext?.uid || 'Field';
  const fieldType = fieldContext?.data_type || 'field';
  const property = diff.path.join('.');
  const cleanType = fieldType === 'field' ? 'field' : fieldType;
  
  const newValue = formatValue(diff.value);
  const oldValue = getOldValueFromDiff(diff, fieldContext);
  
  // Schema-level changes
  if (property === 'schema') {
    switch (diff.op) {
      case 'add': return `New ${cleanType} field '${fieldName}' added to content type`;
      case 'remove': return `${cleanType} field '${fieldName}' removed from content type`;
      case 'replace': return `${cleanType} field '${fieldName}' schema updated from '${oldValue}' to '${newValue}'`;
    }
  }
  
  // Nested schema changes
  if (property.includes('schema')) {
    switch (diff.op) {
      case 'add': return `New ${cleanType} field '${newValue}' added to ${fieldName} schema`;
      case 'remove': return `${cleanType} field '${newValue}' removed from ${fieldName} schema`;
    }
  }
  
  // Property changes
  switch (diff.op) {
    case 'add': return `Property '${property}' added to ${fieldName} with value: ${newValue}`;
    case 'remove': return `Property '${property}' removed from ${fieldName} (was: ${oldValue})`;
    case 'replace': return `Property '${property}' in ${fieldName} changed from '${oldValue}' to '${newValue}'`;
    default: return `${diff.op}: ${newValue}`;
  }
}


/**
 * Extract a value from an object using a path array
 * @param obj - The object to traverse
 * @param path - Array of path segments
 * @returns The value at the path, or undefined if not found
 */
export function extractValueFromPath(obj: any, path: (string | number)[]): any {
  if (!obj || !path || path.length === 0) return undefined;
  
  try {
    let value = obj;
    for (const pathSegment of path) {
      if (value && typeof value === 'object') {
        value = value[pathSegment];
      } else {
        return undefined;
      }
    }
    return value;
  } catch (error) {
    log.debug(`Failed to extract value from path ${path.join('.')}:`, error);
    return undefined;
  }
}


/**
 * Generate a descriptive field path showing the hierarchical location
 * @param field - The field object containing path information
 * @param contentTypeName - The name of the content type (for root-level context)
 * @returns {string} Descriptive field path in readable format
 */
export function generateFieldPath(field: any, contentTypeName?: string): string {
  if (!field.path || field.path === 'N/A') {
    return 'N/A';
  }

  let readablePath = contentTypeName || '';
  
  if (field.path.includes('.')) {
    const pathParts = field.path.split('.');
    const readableParts = pathParts.map(part => {
      if (part === 'schema') return '';
      return part;
    }).filter(part => part !== '');
    
    if (readableParts.length > 0) {
      readablePath += readablePath ? ' → ' : '';
      readablePath += readableParts.join(' → ');
    }
  } else if (field.path.includes('[') && field.path.includes(']')) {
    if (readablePath) {
      readablePath += ' → ';
    }
    readablePath += field.displayName || field.uid || field.path;
  } else {
    if (readablePath) {
      readablePath += ' → ';
    }
    readablePath += field.path;
  }
  
  return readablePath || 'N/A';
}




/**
 * Generate CSV data from verbose results
 * @param verboseRes - The verbose results containing all diff data
 * @returns {CSVRow[]} Array of CSV rows
 */
export function generateCSVDataFromVerbose(verboseRes: BranchDiffVerboseRes): CSVRow[] {
  const csvRows: CSVRow[] = [];
  let srNo = 1;

  if (verboseRes.modified?.length) {
    for (const moduleDetail of verboseRes.modified) {
      const contentTypeName = moduleDetail.moduleDetails.title || moduleDetail.moduleDetails.uid || 'Unknown';
      
      if (moduleDetail.modifiedFields) {
        addFieldChangesToCSV(csvRows, contentTypeName, moduleDetail.modifiedFields, 'modified', srNo);
        srNo += getFieldCount(moduleDetail.modifiedFields);
      }
    }
  }

  if (verboseRes.added?.length) {
    for (const item of verboseRes.added) {
      const contentTypeName = item.title || item.uid || 'Unknown';
      const modifiedValue = generateChangeDescription('added', { title: contentTypeName }, 'contentType');
      
      csvRows.push({
        srNo: srNo++,
        contentTypeName,
        fieldName: 'Content Type',
        fieldPath: 'N/A',
        operation: 'added',
        modifiedValue,
        sourceBranchValue: 'N/A',
        targetBranchValue: 'N/A',
      });
    }
  }

  if (verboseRes.deleted?.length) {
    for (const item of verboseRes.deleted) {
      const contentTypeName = item.title || item.uid || 'Unknown';
      const modifiedValue = generateChangeDescription('deleted', { title: contentTypeName }, 'contentType');
      
      csvRows.push({
        srNo: srNo++,
        contentTypeName,
        fieldName: 'Content Type',
        fieldPath: 'N/A',
        operation: 'deleted',
        modifiedValue,
        sourceBranchValue: 'N/A',
        targetBranchValue: 'N/A',
      });
    }
  }

  return csvRows;
}

/**
 * Add field changes to CSV rows
 * @param csvRows - Array of CSV rows to add to
 * @param contentTypeName - Name of the content type
 * @param modifiedFields - Field changes data
 * @param operation - Type of operation (modified, added, deleted)
 * @param startSrNo - Starting serial number
 */
function addFieldChangesToCSV(csvRows: CSVRow[], contentTypeName: string, modifiedFields: ModifiedFieldsInput, operation: string, startSrNo: number): void {
  const fieldTypes = ['modified', 'added', 'deleted'];
  let srNo = startSrNo;

  fieldTypes.forEach(fieldType => {
    const fields = modifiedFields[fieldType];
    if (!fields) return;

    fields.forEach(field => {
      const fieldName = getFieldDisplayName(field);
      const fieldPath = generateFieldPath(field, contentTypeName);

      if (field.propertyChanges?.length > 0) {
        field.propertyChanges.forEach(propertyChange => {
          csvRows.push({
            srNo: srNo++,
            contentTypeName,
            fieldName,
            fieldPath,
            operation: fieldType,
            modifiedValue: propertyChange.changeDescription,
            sourceBranchValue: formatValue(propertyChange.newValue),
            targetBranchValue: formatValue(propertyChange.oldValue),
          });
        });
      } else {
        const modifiedValue = generateChangeDescription(fieldType, field);
        csvRows.push({
          srNo: srNo++,
          contentTypeName,
          fieldName,
          fieldPath,
          operation: fieldType,
          modifiedValue,
          sourceBranchValue: fieldType === 'added' ? 'N/A' : formatValue(field),
          targetBranchValue: fieldType === 'deleted' ? 'N/A' : formatValue(field),
        });
      }
    });
  });
}

/**
 * Get total field count for serial number calculation
 * @param modifiedFields - Field changes data
 * @returns {number} Total number of fields
 */
function getFieldCount(modifiedFields: ModifiedFieldsInput): number {
  let count = 0;
  const fieldTypes = ['modified', 'added', 'deleted'];
  
  fieldTypes.forEach(fieldType => {
    const fields = modifiedFields[fieldType];
    if (fields) {
      fields.forEach(field => {
        if (field.propertyChanges?.length > 0) {
          count += field.propertyChanges.length;
        } else {
          count += 1;
        }
      });
    }
  });
  
  return count;
}

/**
 * Export CSV report to file using pre-processed data
 * @param moduleName - The module name (content-types, global-fields, etc.)
 * @param diffData - The diff data from branch comparison (must include csvData)
 * @param customPath - Optional custom path for CSV output
 */
export function exportCSVReport(
  moduleName: string,
  diffData: BranchDiffVerboseRes,
  customPath?: string,
): void {
  let csvPath: string;
  if (customPath) {
    csvPath = join(customPath, `${sanitizePath(moduleName)}-diff.csv`);
    
    if (!existsSync(customPath)) {
      mkdirSync(customPath, { recursive: true });
    }
  } else {
    csvPath = join(process.cwd(), `${sanitizePath(moduleName)}-diff.csv`);
  }

  const csvRows = diffData.csvData || [];

  const csvHeader = 'Sr No,Content Type Name,Field Name,Field Path,Operation,Modified Value,Source Branch Value,Target Branch Value\n';
  const csvContent = csvRows.map(row =>
    `${row.srNo},"${row.contentTypeName}","${row.fieldName}","${row.fieldPath}","${row.operation}","${row.modifiedValue}","${row.sourceBranchValue}","${row.targetBranchValue}"`
  ).join('\n');

  writeFileSync(csvPath, csvHeader + csvContent);

  cliux.print(`CSV report generated at: ${csvPath}`, { color: 'green' });
}
