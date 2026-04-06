# Framework Patterns

Core utilities, configuration, logging, and framework patterns for Contentstack CLI development.

## Configuration Management

The `@contentstack/cli-utilities` package exports `configHandler` for centralized configuration access.

### Using configHandler
```typescript
import { configHandler } from '@contentstack/cli-utilities';

// Get config values (no arguments returns all config)
const allConfig = configHandler.get();

// Get specific config
const region = configHandler.get('region');
const email = configHandler.get('email');
const authToken = configHandler.get('authenticationMethod');
const userUid = configHandler.get('userUid');
const oauthOrgUid = configHandler.get('oauthOrgUid');

// Set config
configHandler.set('region', 'us');
configHandler.set('email', 'user@example.com');
```

### Config Keys
- `region` - Current region setting (us, eu, etc.)
- `email` - User email address
- `authenticationMethod` - Auth method used
- `userUid` - User unique identifier
- `oauthOrgUid` - OAuth organization UID
- `authenticationMethod` - Authentication method

## Logging Framework

The `@contentstack/cli-utilities` exports a winston-based `log` (v2Logger) for structured logging.

### Structured Logging
```typescript
import { log } from '@contentstack/cli-utilities';

// Debug level
log.debug('Starting operation', { 
  command: 'cm:auth:login',
  timestamp: new Date().toISOString()
});

// Info level
log.info('Operation completed', { 
  itemsProcessed: 100,
  duration: 5000
});

// Warn level
log.warn('Deprecated flag used', { 
  flag: '--old-flag',
  alternative: '--new-flag'
});

// Error level
log.error('Operation failed', { 
  errorCode: 'ERR_AUTH_001',
  message: 'Invalid credentials'
});
```

### Log Context Creation
```typescript
import { createLogContext } from '@contentstack/cli-utilities';

// Create context for logging
const logContext = createLogContext(
  command,      // command name
  module,       // module name
  authMethod    // authentication method
);

// Use in command
const contextDetails = {
  ...logContext,
  userId: configHandler.get('userUid'),
  email: configHandler.get('email')
};
```

## Error Handling Framework

The utilities provide error handling functions and error classes.

### handleAndLogError Function
```typescript
import { handleAndLogError } from '@contentstack/cli-utilities';

try {
  await risky operation();
} catch (error) {
  handleAndLogError(error, {
    module: 'config-set-region',
    command: 'cm:config:set:region',
    flags: { region: 'eu' }
  });
}
```

### CLIError Class
```typescript
import { CLIError } from '@contentstack/cli-utilities';

// Throw user-friendly errors
if (!region) {
  throw new CLIError('Region is required');
}

if (invalidEnvironments.length > 0) {
  throw new CLIError(`Invalid environments: ${invalidEnvironments.join(', ')}`);
}
```

### Error Context
```typescript
// Include context for debugging
try {
  const response = await this.client.fetch();
} catch (error) {
  handleAndLogError(error, {
    module: 'asset-service',
    command: this.id,
    context: {
      userId: this.contextDetails.userId,
      email: this.contextDetails.email,
      region: configHandler.get('region')
    }
  });
}
```

## CLI UX / User Output

The `cliux` utility provides user-friendly output functions.

### Success Messages
```typescript
import { cliux } from '@contentstack/cli-utilities';

// Simple success
cliux.success('Configuration updated successfully');

// Success with details
cliux.success('Region set to us');
cliux.success('CMA host: https://api.contentstack.io');
cliux.success('CDA host: https://cdn.contentstack.io');
```

### Error Messages
```typescript
cliux.error('Authentication failed');
cliux.error('Invalid region: custom');
cliux.error('Environment not found or inaccessible');
```

### Print with Color
```typescript
// Blue for info
cliux.print('Processing items...', { color: 'blue' });

// Show progress
cliux.print(`Progress: ${completed}/${total} items`, { color: 'blue' });

// Status messages
cliux.print('✅ Operation completed', { color: 'green' });
cliux.print('🔄 Syncing configuration...', { color: 'blue' });
```

### User Input
```typescript
// Prompt for string input
const region = await cliux.prompt('Enter region:');

// Prompt with choices (using inquirer)
const response = await cliux.prompt('Select action:', {
  choices: ['publish', 'unpublish', 'delete']
});
```

### Display Tables
```typescript
// Display data in table format
cliux.table([
  { name: 'Alice', region: 'us', status: 'active' },
  { name: 'Bob', region: 'eu', status: 'inactive' }
]);

// With custom columns
const data = [
  { uid: 'entry-1', title: 'Entry 1', locale: 'en' },
  { uid: 'entry-2', title: 'Entry 2', locale: 'en' }
];
cliux.table(data);
```

## HTTP Client

The `httpClient` provides HTTP request functionality with error handling.

### Basic Requests
```typescript
import { httpClient } from '@contentstack/cli-utilities';

// GET request
const response = await httpClient.request({
  url: 'https://api.contentstack.io/v3/stacks',
  method: 'GET',
  headers: { 'Authorization': `Bearer ${token}` }
});

// POST request
const postResponse = await httpClient.request({
  url: 'https://api.contentstack.io/v3/stacks',
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ name: 'My Stack' })
});
```

### Error Handling
```typescript
try {
  const response = await httpClient.request({
    url: endpoint,
    method: 'GET',
    headers: getAuthHeaders()
  });
} catch (error: any) {
  if (error.status === 429) {
    cliux.error('Rate limited. Please try again later.');
  } else if (error.status === 401) {
    cliux.error('Authentication failed. Please login again.');
  } else {
    handleAndLogError(error, { module: 'http-client' });
  }
}
```

## Command Base Class

Commands should extend `Command` from `@contentstack/cli-command`.

### Basic Command Structure
```typescript
import { Command } from '@contentstack/cli-command';
import { FlagInput, args } from '@contentstack/cli-utilities';

export default class MyCommand extends Command {
  static description = 'Clear description of what this command does';
  
  static flags: FlagInput = {
    region: flags.string({
      char: 'r',
      description: 'Target region (us/eu)',
      required: false
    }),
    verbose: flags.boolean({
      char: 'v',
      description: 'Show verbose output',
      default: false
    })
  };
  
  static args = {
    name: args.string({ description: 'Name of item', required: false })
  };
  
  static examples = [
    '$ csdx my:command',
    '$ csdx my:command --region eu'
  ];
  
  async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(MyCommand);
      // Validate flags
      if (!flags.region) {
        this.error('--region is required');
      }
      
      // Implementation
      this.log('Starting operation...');
      // ... perform operation ...
      cliux.success('Operation completed');
    } catch (error) {
      handleAndLogError(error, { module: 'my-command' });
    }
  }
}
```

### Command Lifecycle
```typescript
export abstract class BaseCommand extends Command {
  public async init(): Promise<void> {
    await super.init();
    // Initialize context, config, logging
    this.contextDetails = createLogContext(
      this.context?.info?.command,
      '',
      configHandler.get('authenticationMethod')
    );
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // Custom error handling
    return super.catch(err);
  }

  protected async finally(_: Error | undefined): Promise<any> {
    // Cleanup after command
    return super.finally(_);
  }
}
```

## Authentication Patterns

### Auth Handler
```typescript
import { authHandler } from '@contentstack/cli-utilities';

// Check if authenticated
const isAuthenticated = !!configHandler.get('authenticationMethod');

// Get auth token
const token = await authHandler.getToken();

// Set config data (e.g., during logout)
await authHandler.setConfigData('logout');
```

### Checking Authentication in Commands
```typescript
if (!configHandler.get('authenticationMethod')) {
  throw new CLIError('Authentication required. Please login first.');
}
```

### OAuth Token Refresh Serialization

When multiple API calls happen concurrently and a token refresh is needed, serialize the refresh operation so all concurrent callers await the same refresh instead of duplicate refresh attempts.

**The Pattern:**
```typescript
private oauthRefreshInFlight: Promise<void> | null = null;

async compareOAuthExpiry(force: boolean = false): Promise<void> {
  const oauthDateTime = configHandler.get(this.oauthDateTimeKeyName);
  const authorisationType = configHandler.get(this.authorisationTypeKeyName);
  
  if (oauthDateTime && authorisationType === this.authorisationTypeOAUTHValue) {
    const now = new Date();
    const oauthDate = new Date(oauthDateTime);
    const oauthValidUpto = new Date(oauthDate.getTime() + 59 * 60 * 1000);
    const tokenExpired = oauthValidUpto <= now;
    const shouldRefresh = force || tokenExpired;

    if (!shouldRefresh) {
      return Promise.resolve();
    }

    // If a refresh is already in progress, return the existing promise
    // so concurrent callers await the same operation
    if (this.oauthRefreshInFlight) {
      return this.oauthRefreshInFlight;
    }

    // Create and store the refresh promise
    this.oauthRefreshInFlight = (async () => {
      try {
        if (force) {
          cliux.print('Forcing token refresh...');
        } else {
          cliux.print('Token expired, refreshing the token');
        }
        await this.refreshToken();
      } catch (error) {
        cliux.error('Error refreshing token');
        throw error;
      } finally {
        // Clear the reference after completion
        this.oauthRefreshInFlight = null;
      }
    })();

    return this.oauthRefreshInFlight;
  } else {
    cliux.print('No OAuth configuration set.');
    return Promise.resolve();
  }
}
```

**Key Benefits:**
- **Prevents duplicate refreshes** — Only one refresh happens even with multiple concurrent API calls
- **Concurrent call serialization** — All callers wait for the same refresh to complete
- **Clean state management** — The promise reference is cleared after completion
- **Error propagation** — Errors in the refresh are thrown to all awaiting callers

**Use This Pattern For:**
- OAuth token refresh operations
- Any critical operation that should only run once even with concurrent triggers
- Operations where parallel execution would cause conflicts or race conditions

## Common Patterns

### Error and Success Pattern
```typescript
async run(): Promise<void> {
  try {
    this.log('Starting operation...');
    const result = await this.performOperation();
    cliux.success(`✅ Success: ${result}`);
  } catch (error) {
    handleAndLogError(error, { 
      module: 'my-command',
      command: this.id
    });
  }
}
```

### Progress Reporting Pattern
```typescript
cliux.print('Processing items...', { color: 'blue' });
let count = 0;
for (const item of items) {
  await this.processItem(item);
  count++;
  cliux.print(`Progress: ${count}/${items.length} items`, { color: 'blue' });
}
cliux.success(`✅ Processed ${count} items`);
```

### Dependency Injection Pattern
```typescript
export class MyService {
  constructor(
    private configHandler: any,
    private logger: any,
    private httpClient: any
  ) {}
  
  async execute(): Promise<void> {
    this.logger.debug('Starting service');
    const config = this.configHandler.get('region');
    // Use injected dependencies
  }
}

// In command
const service = new MyService(configHandler, log, httpClient);
await service.execute();
```
