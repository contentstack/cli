import map from "lodash/map";
import omit from "lodash/omit";
import assign from "lodash/assign";
import isEmpty from "lodash/isEmpty";
import forEach from "lodash/forEach";
import filter from "lodash/filter";

const mapKeyAndVal = (
  array: Array<Record<string, any>>,
  keyName: string | string[],
  omitKeys: Array<string> = []
) => {
  const getKeysFromArray = (keys: string[], obj: any) => {
    let keyName = "";
    forEach(
      keys,
      (key: string) => (keyName += keyName ? `_${obj[key]}` : obj[key])
    );

    return keyName;
  };

  return assign(
    {},
    ...map(array, (row) => {
      if (Array.isArray(keyName))
        return { [getKeysFromArray(keyName, row)]: omit(row, omitKeys) };
      else return { [row[keyName]]: omit(row, omitKeys) };
    })
  );
};

const getMetaData = (
  array: Array<Record<string, any>>,
  pickKeys: Array<string> = [],
  handler?: Function
) => {
  if (handler instanceof Function) handler(array);
  if (isEmpty(array)) return;

  return map(array, (row: any) => {
    let res: any = {};
    forEach(pickKeys, (element: any) => {
      res[element] = row[element];
    });
    return res;
  });
};

export { mapKeyAndVal, getMetaData };
