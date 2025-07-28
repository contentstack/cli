const { cliux } = require('@contentstack/cli-utilities');
const { fetchBulkPublishLimit } = require('./common-utility');

// Singleton instances per organization
const rateLimiterInstances = new Map();

class SmartRateLimiter {
  constructor(orgUid) {
    this.orgUid = orgUid;
    this.bulkPublishLimit = fetchBulkPublishLimit(orgUid);
    this.xRateLimitRemaining = this.bulkPublishLimit;
    this.serverRateLimit = null; // Track the actual server rate limit
    this.pendingItems = [];
    this.isProcessing = false;
    this.requestCount = 0; // Track total requests made
    this.lastStatusLog = 0; // Prevent duplicate status logs
  }

  /**
   * Log request attempt
   * @param {string} operation - Type of operation (publish, unpublish, etc.)
   * @param {string} itemType - Type of item (entry, asset, etc.)
   * @param {string} itemId - ID of the item being processed
   */
  logRequestAttempt(operation, itemType, itemId) {
    this.requestCount++;
    // cliux.print(
    //   `[${this.requestCount}] ${operation.toUpperCase()} ${itemType}: ${itemId} (${this.xRateLimitRemaining} remaining)`,
    //   { color: 'cyan' }
    // );
  }

  /**
   * Log request success
   * @param {string} operation - Type of operation
   * @param {string} itemType - Type of item
   * @param {string} itemId - ID of the item
   * @param {Object} response - Server response
   */
  logRequestSuccess(operation, itemType, itemId, response) {
    // cliux.print(
    //   `[${this.requestCount}] ✓ ${operation.toUpperCase()} ${itemType}: ${itemId} - SUCCESS`,
    //   { color: 'green' }
    // );
    
    // Update rate limit from response
    this.updateRateLimit(response);
  }

  /**
   * Log request failure
   * @param {string} operation - Type of operation
   * @param {string} itemType - Type of item
   * @param {string} itemId - ID of the item
   * @param {Object} error - Error object
   */
  logRequestFailure(operation, itemType, itemId, error) {
    const errorCode = error.errorCode || 'UNKNOWN';
    const errorMessage = error.message || error.error_message || 'Unknown error';
    
    // cliux.print(
    //   `[${this.requestCount}] ✗ ${operation.toUpperCase()} ${itemType}: ${itemId} - FAILED (${errorCode})`,
    //   { color: 'red' }
    // );
    
    if (errorCode === 429) {
      cliux.print(
        `[${this.requestCount}] Rate limit exceeded - will retry after delay`,
        { color: 'yellow' }
      );
    } else {
      cliux.print(
        `[${this.requestCount}] Error: ${errorMessage}`,
        { color: 'red' }
      );
    }
  }

  /**
   * Log rate limit check
   * @param {number} itemsToProcess - Number of items to process
   * @param {boolean} canProcess - Whether processing is allowed
   */
  logRateLimitCheck(itemsToProcess, canProcess) {
    if (!canProcess) {
      cliux.print(
        `Rate limit check: Cannot process items (${this.xRateLimitRemaining} remaining) - waiting...`,
        { color: 'yellow' }
      );
    } else {
      cliux.print(
        `Rate limit check: Can process ${itemsToProcess} items (${this.xRateLimitRemaining} remaining)`,
        { color: 'green' }
      );
    }
  }

  /**
   * Update rate limit from server response
   * @param {Object} response - Server response with headers
   */
  updateRateLimit(response) {
    if (response?.stackHeaders?.responseHeaders) {
      // Handle AxiosHeaders object - try different access methods
      const headers = response.stackHeaders.responseHeaders;
      let remaining, limit;
      
      // Try different ways to access the headers
      if (headers['x-ratelimit-remaining']) {
        remaining = headers['x-ratelimit-remaining'];
      } else if (headers.get && headers.get('x-ratelimit-remaining')) {
        remaining = headers.get('x-ratelimit-remaining');
      } else if (headers.x_ratelimit_remaining) {
        remaining = headers.x_ratelimit_remaining;
      }
      
      if (headers['x-ratelimit-limit']) {
        limit = headers['x-ratelimit-limit'];
      } else if (headers.get && headers.get('x-ratelimit-limit')) {
        limit = headers.get('x-ratelimit-limit');
      } else if (headers.x_ratelimit_limit) {
        limit = headers.x_ratelimit_limit;
      }
      
      if (remaining) {
        const newRateLimit = parseInt(remaining, 10);
        
        // Update server rate limit if we get the total limit from headers
        if (limit) {
          this.serverRateLimit = parseInt(limit, 10);
        }
        
        // Only update if the new value is different to avoid unnecessary logging
        if (this.xRateLimitRemaining !== newRateLimit) {
          this.xRateLimitRemaining = newRateLimit;
          // cliux.print(`Rate limit updated: ${this.xRateLimitRemaining} remaining`, { color: 'blue' });
        }
      }
    }
  }

  /**
   * Get the optimal batch size based on current rate limit
   * @param {number} totalItems - Total items to process
   * @returns {number} - Optimal batch size
   */
  getOptimalBatchSize(totalItems) {
    // Be more conservative when rate limit is low
    let maxBatchSize = this.xRateLimitRemaining;
    
    // If rate limit is 2 or less, only process 1 item at a time
    if (this.xRateLimitRemaining <= 2) {
      maxBatchSize = 1;
    }
    // If rate limit is 5 or less, limit batch size to 2
    else if (this.xRateLimitRemaining <= 5) {
      maxBatchSize = Math.min(2, this.xRateLimitRemaining);
    }
    
    // Use the smaller of: adjusted rate limit, configured batch limit, or total items
    const optimalSize = Math.min(
      maxBatchSize,
      this.bulkPublishLimit,
      totalItems
    );
    
    if (optimalSize <= 0) {
      // cliux.print(`Rate limit exhausted (${this.xRateLimitRemaining} remaining). Waiting for reset...`, { color: 'yellow' });
      return 0;
    }
    return optimalSize;
  }

  /**
   * Check if we can process items
   * @param {number} itemsToProcess - Number of items to process
   * @returns {boolean} - True if can process
   */
  canProcess(itemsToProcess = 1) {
    // Get the optimal batch size for the requested number of items
    const optimalBatchSize = this.getOptimalBatchSize(itemsToProcess);
    const canProcess = optimalBatchSize > 0;
    
    // Add proactive delay when rate limit is low (1-2 remaining)
    if (this.xRateLimitRemaining <= 2 && this.xRateLimitRemaining > 0) {
      // cliux.print(
      //   `Rate limit low (${this.xRateLimitRemaining} remaining) - adding proactive delay to prevent 429 errors`,
      //   { color: 'yellow' }
      // );
      return false; // Force a delay to let rate limit recover
    }
    // this.logRateLimitCheck(optimalBatchSize, canProcess);
    return canProcess;
  }

  /**
   * Process items with rate limit awareness
   * @param {Array} items - Items to process
   * @param {Function} processFunction - Function to process items
   * @param {Function} delayFunction - Delay function
   * @returns {Promise<Array>} - Processed items
   */
  async processItemsWithRateLimit(items, processFunction, delayFunction) {
    const results = [];
    let currentIndex = 0;

    while (currentIndex < items.length) {
      const remainingItems = items.length - currentIndex;
      const optimalBatchSize = this.getOptimalBatchSize(remainingItems);

      if (optimalBatchSize === 0) {
        // Rate limit exhausted, wait and retry
        cliux.print('Rate limit reached. Waiting 1 second before retry...', { color: 'yellow' });
        await delayFunction(1000);
        continue;
      }

      // Take the optimal batch size
      const batch = items.slice(currentIndex, currentIndex + optimalBatchSize);
      
      try {
        const result = await processFunction(batch);
        results.push(result);
        
        // Update rate limit (assuming processFunction returns response with headers)
        if (result && result.stackHeaders) {
          this.updateRateLimit(result);
        }
        
        currentIndex += optimalBatchSize;
        
        cliux.print(`Processed ${batch.length} items. ${items.length - currentIndex} remaining.`, { color: 'green' });
        
      } catch (error) {
        if (error.errorCode === 429) {
          // Rate limit error, wait and retry
          cliux.print('Rate limit error (429). Waiting 1 second before retry...', { color: 'yellow' });
          await delayFunction(1000);
          // Don't increment currentIndex, retry the same batch
        } else {
          // Other error, skip this batch
          cliux.print(`Error processing batch: ${error.message}`, { color: 'red' });
          currentIndex += optimalBatchSize;
        }
      }
    }

    return results;
  }

  /**
   * Create batches based on rate limit
   * @param {Array} items - Items to batch
   * @returns {Array} - Array of batches
   */
  createOptimalBatches(items) {
    const batches = [];
    let currentIndex = 0;

    while (currentIndex < items.length) {
      const remainingItems = items.length - currentIndex;
      const optimalBatchSize = this.getOptimalBatchSize(remainingItems);

      if (optimalBatchSize === 0) {
        // Can't process any more items due to rate limit
        break;
      }

      const batch = items.slice(currentIndex, currentIndex + optimalBatchSize);
      batches.push(batch);
      currentIndex += optimalBatchSize;
    }

    return {
      batches,
      remainingItems: items.slice(currentIndex) // Items that couldn't be batched due to rate limit
    };
  }

  /**
   * Get current rate limit status
   * @returns {Object} - Rate limit status
   */
  getStatus() {
    return {
      rateLimitRemaining: this.xRateLimitRemaining,
      bulkPublishLimit: this.bulkPublishLimit,
      serverRateLimit: this.serverRateLimit,
      canProcess: this.xRateLimitRemaining > 0,
      requestCount: this.requestCount
    };
  }

  /**
   * Log current status
   */
  logStatus() {
    const status = this.getStatus();
    const totalLimit = this.serverRateLimit || this.bulkPublishLimit;
    const status_rate_limit = `${status.rateLimitRemaining}/${totalLimit}/${status.requestCount}`;
    
    if (this.lastStatusLog !== status_rate_limit) {
      // cliux.print(
      //   `Rate Limit Status - Remaining: ${status.rateLimitRemaining}/${totalLimit} (Total requests: ${status.requestCount})`,
      //   { color: status.canProcess ? 'green' : 'yellow' }
      // );
      this.lastStatusLog = status_rate_limit;
    }
  }
}

/**
 * Create a smart rate limiter instance (singleton per organization)
 * @param {string} orgUid - Organization UID
 * @returns {SmartRateLimiter} - Smart rate limiter instance
 */
function createSmartRateLimiter(orgUid) {
  // Return existing instance if available for this organization
  if (rateLimiterInstances.has(orgUid)) {
    return rateLimiterInstances.get(orgUid);
  }
  
  // Create new instance and store it
  const instance = new SmartRateLimiter(orgUid);
  rateLimiterInstances.set(orgUid, instance);
  return instance;
}

module.exports = {
  SmartRateLimiter,
  createSmartRateLimiter
}; 