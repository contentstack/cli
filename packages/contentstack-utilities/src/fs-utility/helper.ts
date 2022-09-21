import map from 'lodash/map'
import omit from 'lodash/omit'
import assign from 'lodash/assign'

const mapKeyAndVal = (array: Array<Record<string, string>>, keyName: string, omitKeys: Array<string> = []) => {
  return assign({}, ...map(array, (row) => ({ [row[keyName]]: omit(row, omitKeys) })))
}

export {
  mapKeyAndVal
}