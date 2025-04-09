import cliTable, { Header } from 'tty-table';
import * as yaml from 'js-yaml';
import { parse as csvParse } from 'papaparse';
import { Flags } from '@oclif/core';
import { cliux, FlagInput } from '.';

export interface TableFlags {
  extended?: boolean;
  columns?: string;
  csv?: boolean;
  filter?: string;
  'no-header'?: boolean;
  'no-truncate'?: boolean;
  output?: 'csv' | 'json' | 'yaml';
  sort?: string;
}

/** Type for table headers */
export type TableHeader = Header;

/** Type for table columns mapping */
export type TableColumn = {
  [key: string]: {
    minWidth?: number;
    maxWidth?: number;
    alias?: string;
    align?: 'left' | 'center' | 'right';
  };
};

export type TableData<T extends Record<string, unknown>> = T[];

/** Options for CLI Table rendering */
export type TableOptions = {
  truncate?: boolean; // Prevents text from being cut off
  borderStyle?: 'solid' | 'dashed' | 'none'; // Style of table border
  paddingBottom?: number; // Padding below table rows
  showHeader?: boolean; // Whether to display the table header
  align?: 'left' | 'center' | 'right'; // Default text alignment
  enableHeaderTitle?: boolean; // Whether to display the header title
};

export default class CLITable {
  /** Returns CLI table flags */
  static getTableFlags(columns: string[] = ['columns', 'sort', 'filter', 'csv', 'no-truncate']): FlagInput<TableFlags> {
    const flags = {
      columns: Flags.string({
        description: 'Specify columns to display, comma-separated.',
        helpGroup: 'TABLE',
      }),
      sort: Flags.string({
        description: 'Sort the table by a column. Use "-" for descending.',
        helpGroup: 'TABLE',
      }),
      filter: Flags.string({
        description: 'Filter rows by a column value (e.g., name=foo).',
        helpGroup: 'TABLE',
      }),
      csv: Flags.boolean({
        description: 'Output results in CSV format.',
        helpGroup: 'TABLE',
      }),
      'no-truncate': Flags.boolean({
        description: 'Prevent truncation of long text in columns.',
        helpGroup: 'TABLE',
      }),
      'no-header': Flags.boolean({
        description: 'Hide table headers in output.',
        helpGroup: 'TABLE',
      }),
      output: Flags.string({
        options: ['csv', 'json', 'yaml'],
        description: 'Specify output format: csv, json, or yaml.',
        helpGroup: 'TABLE',
      }),
    };

    // Return only requested flags
    return Object.entries(flags)
      .filter(([key]) => columns.includes(key))
      .reduce(
        (acc, [key, value]) => {
          acc[key] = value;
          return acc;
        },
        {} as Record<string, any>,
      );
  }

  static render(headers: TableHeader[], data: Record<string, unknown>[], flags: TableFlags, options?: TableOptions) {
    let tableData = [...data];

    if (flags) {
      // **Filter Data**
      if (flags.filter) {
        const [key, value] = flags.filter.split('=');
        tableData = tableData.filter((row) => row[key]?.toString().toLowerCase().includes(value.toLowerCase()));
      }
      // **Select Specific Columns**
      if (flags.columns) {
        const selectedColumns = flags.columns.split(',');
        headers = headers.filter((header) => selectedColumns.includes(header.value));
        tableData = tableData.map((row) =>
          selectedColumns.reduce(
            (acc, key) => {
              if (row[key] !== undefined) {
                acc[key] = row[key];
              }
              return acc;
            },
            {} as Record<string, unknown>,
          ),
        );
      }
      // **Sort Data**
      if (flags.sort) {
        const sortKey = flags.sort.replace('-', '');
        const descending = flags.sort.startsWith('-');
        tableData.sort((a, b) => {
          if (a[sortKey] < b[sortKey]) return descending ? 1 : -1;
          if (a[sortKey] > b[sortKey]) return descending ? -1 : 1;
          return 0;
        });
      }
      // **Format Output**
      if (flags.output) {
        switch (flags.output) {
          case 'json':
            console.log(JSON.stringify(tableData, null, 2));
            return;
          case 'yaml':
            console.log(yaml.dump(tableData));
            return;
          case 'csv':
            console.log(csvParse(tableData));
            return;
        }
      }
      if (flags.csv) {
        console.log(csvParse(tableData));
      }
    }

    // **Render Table**
    const config = {
      truncate: !flags?.['no-header'],
      borderStyle: 'solid',
      paddingBottom: 0,
      showHeader: !flags?.['no-header'],
    };

    cliux.print(cliTable(headers, tableData, config).render());
  }
}
