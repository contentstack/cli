// Mock logger for v2 logger implementation
export const mockLogger = {
  info: (message: any) => {
    if (typeof message === 'object' && message.message) {
      process.stdout.write(`INFO: ${message.message}\n`);
    } else {
      process.stdout.write(`INFO: ${message}\n`);
    }
  },
  warn: (message: any) => {
    if (typeof message === 'object' && message.message) {
      process.stdout.write(`WARN: ${message.message}\n`);
    } else {
      process.stdout.write(`WARN: ${message}\n`);
    }
  },
  error: (message: any) => {
    if (typeof message === 'object' && message.message) {
      process.stdout.write(`ERROR: ${message.message}\n`);
    } else {
      process.stdout.write(`ERROR: ${message}\n`);
    }
  },
  debug: (message: any) => {
    if (typeof message === 'object' && message.message) {
      process.stdout.write(`DEBUG: ${message.message}\n`);
    } else {
      process.stdout.write(`DEBUG: ${message}\n`);
    }
  },
  success: (message: any) => {
    if (typeof message === 'object' && message.message) {
      process.stdout.write(`SUCCESS: ${message.message}\n`);
    } else {
      process.stdout.write(`SUCCESS: ${message}\n`);
    }
  }
};
