---
name: framework
description: Core utilities, configuration, logging, and framework patterns for CLI development. Use when working with utilities, configuration management, error handling, or core framework components.
---

# Framework Patterns

## Quick Reference

For comprehensive framework guidance, see:
- **[Framework Patterns](./references/framework-patterns.md)** - Complete utilities, configuration, logging, and framework patterns

## Core Utilities from @contentstack/cli-utilities

### Configuration Management
```typescript
import { configHandler } from '@contentstack/cli-utilities';

// Get config values
const region = configHandler.get('region');
const email = configHandler.get('email');
const authToken = configHandler.get('authenticationMethod');

// Set config values
configHandler.set('region', 'us');
```

### Logging Framework
```typescript
import { log } from '@contentstack/cli-utilities';

// Use structured logging
log.debug('Debug message', { context: 'data' });
log.info('Information message', { userId: '123' });
log.warn('Warning message');
log.error('Error message', { errorCode: 'ERR_001' });
```

### Error Handling
```typescript
import { handleAndLogError, CLIError } from '@contentstack/cli-utilities';

try {
  await operation();
} catch (error) {
  handleAndLogError(error, { 
    module: 'my-command',
    command: 'cm:auth:login'
  });
}

// Or throw CLI errors
throw new CLIError('User-friendly error message');
```

### CLI UX / User Output
```typescript
import { cliux } from '@contentstack/cli-utilities';

// Success message
cliux.success('Operation completed successfully');

// Error message
cliux.error('Something went wrong');

// Print message with color
cliux.print('Processing...', { color: 'blue' });

// Prompt user for input
const response = await cliux.prompt('Enter region:');

// Show table
cliux.table([
  { name: 'Alice', region: 'us' },
  { name: 'Bob', region: 'eu' }
]);
```

### HTTP Client
```typescript
import { httpClient } from '@contentstack/cli-utilities';

// Make HTTP requests with built-in error handling
const response = await httpClient.request({
  url: 'https://api.contentstack.io/v3/stacks',
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Command Base Class

```typescript
import { Command } from '@contentstack/cli-command';

export default class MyCommand extends Command {
  static description = 'My command description';
  
  static flags = {
    region: flags.string({
      char: 'r',
      description: 'Set region'
    })
  };
  
  async run(): Promise<void> {
    const { flags } = await this.parse(MyCommand);
    // Command logic here
  }
}
```

## Error Handling Patterns

### With Context
```typescript
try {
  const result = await this.client.stack().entry().fetch();
} catch (error) {
  handleAndLogError(error, {
    module: 'auth-service',
    command: 'cm:auth:login',
    userId: this.contextDetails.userId,
    email: this.contextDetails.email
  });
}
```

### Custom Errors
```typescript
if (response.status === 401) {
  throw new CLIError('Authentication failed. Please login again.');
}

if (response.status === 429) {
  throw new CLIError('Rate limited. Please try again later.');
}
```

## Usage

Reference the comprehensive patterns guide above for detailed implementations of configuration, logging, error handling, utilities, and dependency injection patterns.
