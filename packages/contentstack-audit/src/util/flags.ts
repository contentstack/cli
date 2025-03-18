import { CLITable, FlagDefinition, Flags } from '@contentstack/cli-utilities';

import { JSONFlagOptions } from '../types';
// import { tableColumnDescriptions } from '../messages';

const defaultJSONOptions = { description: 'Provide JSON input' };

/**
 * The function `getJsonInputFlags` returns a flag definition for parsing JSON input.
 * @param {JSONFlagOptions} options - The `options` parameter is an object that contains the following
 * properties:
 * @returns a `FlagDefinition` object.
 */
function getJsonInputFlags(
  options: JSONFlagOptions = defaultJSONOptions,
): FlagDefinition<Record<string, unknown>, Record<string, unknown>> {
  const { hidden, description = defaultJSONOptions.description } = options;

  return Flags.custom<Record<string, unknown>, Record<string, unknown>>({
    hidden,
    description,
    parse: async (input, _opts) => {
      try {
        return JSON.parse(input);
      } catch (error) {
        throw new Error('Invalid JSON');
      }
    },
  });
}

const tableFlags = CLITable.getTableFlags(['columns', 'sort', 'filter', 'csv', 'no-truncate', 'no-header', 'output']);

export { getJsonInputFlags, tableFlags };
