/**
 * CSV writing utilities.
 * Migrated from: packages/contentstack-export-to-csv/src/util/index.js
 */

import * as os from 'os';
import * as fs from 'fs';
import * as fastcsv from 'fast-csv';
import { cliux } from '@contentstack/cli-utilities';

const directory = './data';
const delimiter = os.platform() === 'win32' ? '\\' : '/';

/**
 * CSV row data type - can be any record with string keys or string array.
 */
type CsvRow = Record<string, unknown> | string[];

/**
 * Write data to a CSV file.
 *
 * @param _command - Command instance (not used but kept for parity)
 * @param entries - Array of objects or string arrays to write
 * @param fileName - Name of the output file
 * @param message - Message type for logging (e.g., 'entries', 'organization details')
 * @param csvDelimiter - CSV delimiter character (default: ',')
 * @param headers - Optional custom headers
 */
export function write(
  _command: unknown,
  entries: CsvRow[],
  fileName: string,
  message: string,
  csvDelimiter?: string,
  headers?: string[],
): void {
  // Create data directory if it doesn't exist
  if (process.cwd().split(delimiter).pop() !== 'data' && !fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  // Change to data directory if not already there
  if (process.cwd().split(delimiter).pop() !== 'data') {
    process.chdir(directory);
  }

  cliux.print(`Writing ${message} to file: "${process.cwd()}${delimiter}${fileName}"`);

  const writeOptions: fastcsv.FormatterOptionsArgs<CsvRow, CsvRow> = {
    headers: headers?.length ? headers : true,
    delimiter: csvDelimiter || ',',
  };

  fastcsv.writeToPath(fileName, entries, writeOptions);
}

/**
 * Parse CSV data and extract headers.
 *
 * @param data - Raw CSV data string
 * @param headers - Array to populate with headers (mutated)
 * @returns Parsed data without header row
 */
export function csvParse(data: string, headers: string[]): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const taxonomies: string[][] = [];

    fastcsv
      .parseString(data, { headers: false })
      .on('data', (rowData: string[]) => {
        taxonomies.push(rowData);
      })
      .on('error', (err: Error) => reject(err))
      .on('end', () => {
        // Extract headers from first row
        taxonomies[0]?.forEach((header: string) => {
          if (!headers.includes(header)) {
            headers.push(header);
          }
        });
        // Return data without header row
        resolve(taxonomies.splice(1));
      });
  });
}
