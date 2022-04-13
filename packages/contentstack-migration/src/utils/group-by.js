'use strict';

module.exports = function groupBy(data, field, i = 0, finalObj = {}, originalArray = []) {
  if (!data) return finalObj;

  if (Array.isArray(data)) {
    groupBy(data[i], field, 0, finalObj, data);
  } else if (field in data) {
    let dataField = data[field];
    if (dataField in finalObj) {
      finalObj[dataField].push(originalArray[i]);
    } else {
      finalObj[dataField] = [];
      finalObj[dataField].push(originalArray[i]);
    }

    i++;

    // Breaks when i has been incremented more than length of original array
    if (i !== 0 && i >= originalArray.length) return finalObj;
    /**
     * After the field is found only then increment i and inspect next item
     * This will restrict iterating through array just to the length of array
     */
    groupBy(originalArray[i], field, i, finalObj, originalArray);
  } else {
    for (let key in data) {
      if (key) {
        let dataKey = data[key];
        if (!Array.isArray(dataKey) && typeof dataKey === 'object') {
          groupBy(dataKey, field, i, finalObj, originalArray);
        }
      }
    }
  }

  return finalObj;
};
