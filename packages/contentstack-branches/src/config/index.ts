const config = {
  skip: 0,
  limit: 100,
  /** Directory under cwd for branch diff/merge JSONL cache */
  cacheDir: '.contentstack-branch-cache',
  /** Items per batch when streaming JSONL reads */
  chunkSize: 50,
  /** Below this total diff item count, materialize in memory (same as pre-cache behavior) */
  maxMemoryItems: 1000,
  /** Batch size for verbose modified-item SDK calls */
  verboseBatchSize: 10,
  jsonLinesFormat: true,
};
export default config;
