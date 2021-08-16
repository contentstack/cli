'use strict';

module.exports = (count, batchLimit) => {
  const partitions = Math.ceil(count / batchLimit);
  // Returns array filled with indexes
  return Array(partitions).fill(null).map((_, i) => i);
};