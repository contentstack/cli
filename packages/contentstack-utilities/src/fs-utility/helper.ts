import map from "lodash/map";
import omit from "lodash/omit";
import pick from "lodash/pick";
import assign from "lodash/assign";
import isEmpty from "lodash/isEmpty";
import forEach from "lodash/forEach";

function getKeysFromArray(keys: string[], obj: any): string {
  let keyName = "";
  forEach(keys, (key: string) => {
    keyName += keyName ? `_${obj[key]}` : obj[key];
  });

  return keyName;
}

function mapKeyAndVal(
  array: Array<Record<string, any>>,
  keyName: string | string[],
  omitKeys: Array<string> = []
): Record<string, unknown> {
  return assign(
    {},
    ...map(array, (row) => {
      if (Array.isArray(keyName))
        return { [getKeysFromArray(keyName, row)]: omit(row, omitKeys) };
      return { [row[keyName]]: omit(row, omitKeys) };
    })
  );
}

function getMetaData(
  array: Array<Record<string, any>>,
  pickKeys: Array<string>,
  handler?: (array: Array<Record<string, any>>) => void
): Array<Record<string, unknown>> | undefined {
  if (handler instanceof Function) handler(array);
  if (isEmpty(array) || isEmpty(pickKeys)) return;

  return map(array, (row: any) => pick(row, pickKeys));
}

export { mapKeyAndVal, getMetaData };
