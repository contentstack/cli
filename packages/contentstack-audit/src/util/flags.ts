import { FlagDefinition, Flags, ux } from '@contentstack/cli-utilities';

import { IFlags, IncludeFlags, JSONFlagOptions } from '../types';
import { tableColumnDescriptions } from '../messages';

const defaultJSONOptions = { description: 'Provide JSON input' };

/**
 * The function `getTableFlags` returns a set of table flags based on the specified columns, with
 * updated descriptions and help groups.
 * @param {(keyof IFlags)[]} columns - An optional array of column keys from the IFlags interface. The
 * default value is ['columns', 'sort', 'filter', 'csv', 'no-truncate'].
 * @returns an object of type `IncludeFlags<IFlags, keyof IFlags>`.
 */
function getTableFlags(
  columns: (keyof IFlags)[] = ['columns', 'sort', 'filter', 'csv', 'no-truncate'],
): IncludeFlags<IFlags, keyof IFlags> {
  const flags = ux.table.flags({
    only: columns,
  }) as IncludeFlags<IFlags, keyof IFlags>;

  // NOTE Assign group and update Descriptions
  columns.forEach((element: keyof IFlags) => {
    flags[element].helpGroup = 'TABLE';

    const descriptionKey = `TABLE_${element.toUpperCase()}` as keyof typeof tableColumnDescriptions;
    flags[element].description = tableColumnDescriptions[descriptionKey] ?? flags[element].description;
  });

  return flags;
}

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

export { getTableFlags, getJsonInputFlags };
