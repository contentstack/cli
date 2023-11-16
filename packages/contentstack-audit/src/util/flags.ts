import { ux } from '@contentstack/cli-utilities';

import { IFlags, IncludeFlags } from '../types';
import { tableColumnDescriptions } from '../messages';

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
    flags.columns.description = tableColumnDescriptions[descriptionKey] ?? flags.columns.description;
  });

  return flags;
}

export { getTableFlags };
