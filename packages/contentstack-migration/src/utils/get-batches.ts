export default (count: number, batchLimit: number): number[] => {
  const partitions = Math.ceil(count / batchLimit);
  // Returns array filled with indexes
  return new Array(partitions).fill(null).map((_, i) => i);
};
