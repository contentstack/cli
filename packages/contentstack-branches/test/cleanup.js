// Cleanup file to clear all timers after tests
after(() => {
  // Clear all timers to prevent hanging
  const timers = require('timers');
  timers.clearTimeout();
  timers.clearInterval();
  timers.clearImmediate();
  
  // Also clear any remaining timers
  if (global.clearTimeout) {
    global.clearTimeout();
  }
  if (global.clearInterval) {
    global.clearInterval();
  }
  if (global.clearImmediate) {
    global.clearImmediate();
  }
});
