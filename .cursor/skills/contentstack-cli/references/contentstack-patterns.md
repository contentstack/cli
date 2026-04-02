# Contentstack CLI Patterns

Contentstack CLI development patterns, OCLIF commands, API integration, and configuration workflows.

## OCLIF Command Structure

### Base Command Pattern
```typescript
import { BaseCommand } from '../../base-command';
import { FlagInput } from '@contentstack/cli-utilities';
import { cliux, handleAndLogError } from '@contentstack/cli-utilities';

export default class MyCommand extends BaseCommand<typeof MyCommand> {
  static description = 'Clear description of command';
  static aliases = ['shortcut']; // Optional alias
  
  static flags: FlagInput = {
    region: flags.string({
      char: 'r',
      description: 'Target region',
      required: false,
      default: 'us'
    }),
    verbose: flags.boolean({
      char: 'v',
      description: 'Show verbose output',
      default: false
    })
  };
  
  static examples = [
    '$ csdx my:command',
    '$ csdx my:command --region eu',
    '$ csdx shortcut'
  ];

  async run(): Promise<void> {
    try {
      const { flags: parsedFlags } = await this.parse(MyCommand);
      
      // Validate flags
      if (!parsedFlags.region) {
        this.error('Region is required');
      }
      
      // Implementation
      cliux.print('Processing...', { color: 'blue' });
      const result = await this.execute(parsedFlags);
      
      cliux.success('✅ Operation completed successfully');
    } catch (error) {
      handleAndLogError(error, { 
        ...this.contextDetails,
        module: 'my-command'
      });
    }
  }

  private async execute(flags: any): Promise<void> {
    // Implementation here
  }
}
```

### Command Topics and Naming
Commands are organized by topic hierarchy:
- `src/commands/auth/login.ts` → command `cm:auth:login`
- `src/commands/auth/tokens/add.ts` → command `cm:auth:tokens:add`
- `src/commands/config/set/region.ts` → command `cm:config:set:region`
- `src/commands/config/get/region.ts` → command `cm:config:get:region`

### Flag Validation Patterns

#### Early Validation
```typescript
async run(): Promise<void> {
  const { flags } = await this.parse(MyCommand);
  
  // Validate required flags
  if (!flags.region) {
    this.error('--region is required');
  }
  
  // Validate flag values
  const validRegions = ['us', 'eu', 'au'];
  if (!validRegions.includes(flags.region)) {
    this.error(`Region must be one of: ${validRegions.join(', ')}`);
  }
}
```

#### Exclusive Flags
```typescript
static flags: FlagInput = {
  username: flags.string({
    char: 'u',
    exclusive: ['oauth'] // Cannot use with oauth flag
  }),
  oauth: flags.boolean({
    exclusive: ['username', 'password']
  })
};
```

#### Dependent Flags
```typescript
static flags: FlagInput = {
  cma: flags.string({
    dependsOn: ['cda', 'name']
  }),
  cda: flags.string({
    dependsOn: ['cma', 'name']
  })
};
```

## Authentication Commands

### Login Command
```typescript
export default class LoginCommand extends BaseCommand<typeof LoginCommand> {
  static description = 'User sessions login';
  static aliases = ['login'];
  
  static flags: FlagInput = {
    username: flags.string({
      char: 'u',
      description: 'Email address of your Contentstack account',
      exclusive: ['oauth']
    }),
    password: flags.string({
      char: 'p',
      description: 'Password of your Contentstack account',
      exclusive: ['oauth']
    }),
    oauth: flags.boolean({
      description: 'Enable single sign-on (SSO)',
      default: false,
      exclusive: ['username', 'password']
    })
  };

  async run(): Promise<void> {
    try {
      const managementAPIClient = await managementSDKClient({ 
        host: this.cmaHost,
        skipTokenValidity: true
      });
      
      const { flags: loginFlags } = await this.parse(LoginCommand);
      authHandler.client = managementAPIClient;

      if (loginFlags.oauth) {
        log.debug('Starting OAuth flow', this.contextDetails);
        oauthHandler.host = this.cmaHost;
        await oauthHandler.oauth();
      } else {
        const username = loginFlags.username || await interactive.askUsername();
        const password = loginFlags.password || await interactive.askPassword();
        await authHandler.login(username, password);
      }
      
      cliux.success('✅ Authenticated successfully');
    } catch (error) {
      handleAndLogError(error, this.contextDetails);
    }
  }
}
```

### Logout Command
```typescript
export default class LogoutCommand extends BaseCommand<typeof LogoutCommand> {
  static description = 'Logout from Contentstack';
  
  async run(): Promise<void> {
    try {
      await authHandler.setConfigData('logout');
      cliux.success('✅ Logged out successfully');
    } catch (error) {
      handleAndLogError(error, this.contextDetails);
    }
  }
}
```

### Token Management
```typescript
// Add token
export default class TokenAddCommand extends BaseCommand<typeof TokenAddCommand> {
  static description = 'Add authentication token';
  
  static flags: FlagInput = {
    email: flags.string({
      char: 'e',
      description: 'Email address',
      required: true
    }),
    label: flags.string({
      char: 'l',
      description: 'Token label',
      required: false
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(TokenAddCommand);
    // Add token logic
    cliux.success('✅ Token added successfully');
  }
}
```

## Configuration Commands

### Config Get Command
```typescript
export default class ConfigGetCommand extends BaseCommand<typeof ConfigGetCommand> {
  static description = 'Get CLI configuration values';
  
  async run(): Promise<void> {
    try {
      const region = configHandler.get('region');
      cliux.print(`Region: ${region}`);
    } catch (error) {
      handleAndLogError(error, { ...this.contextDetails, module: 'config-get' });
    }
  }
}
```

### Config Set Command
```typescript
export default class RegionSetCommand extends BaseCommand<typeof RegionSetCommand> {
  static description = 'Set region for CLI';
  
  static args = {
    region: args.string({ description: 'Region name (AWS-NA, AWS-EU, etc.)' })
  };
  
  static examples = [
    '$ csdx config:set:region',
    '$ csdx config:set:region AWS-NA',
    '$ csdx config:set:region --cma <url> --cda <url> --ui-host <url> --name "Custom"'
  ];

  async run(): Promise<void> {
    try {
      const { args, flags } = await this.parse(RegionSetCommand);
      
      let selectedRegion = args.region;
      if (!selectedRegion) {
        selectedRegion = await interactive.askRegions();
      }

      const regionDetails = regionHandler.setRegion(selectedRegion);
      await authHandler.setConfigData('logout'); // Reset auth on region change
      
      cliux.success(`✅ Region set to ${regionDetails.name}`);
      cliux.print(`CMA host: ${regionDetails.cma}`);
      cliux.print(`CDA host: ${regionDetails.cda}`);
    } catch (error) {
      handleAndLogError(error, { ...this.contextDetails, module: 'config-set-region' });
    }
  }
}
```

### Config Remove Command
```typescript
export default class ProxyRemoveCommand extends BaseCommand<typeof ProxyRemoveCommand> {
  static description = 'Remove proxy configuration';
  
  async run(): Promise<void> {
    try {
      configHandler.remove('proxy');
      cliux.success('✅ Proxy configuration removed');
    } catch (error) {
      handleAndLogError(error, this.contextDetails);
    }
  }
}
```

## API Integration

### Using Management SDK Client
```typescript
import { managementSDKClient } from '@contentstack/cli-utilities';

// Initialize client
const managementClient = await managementSDKClient({ 
  host: this.cmaHost,
  skipTokenValidity: false
});

// Get stack
const stack = managementClient.stack({ api_key: stackApiKey });

// Fetch entry
const entry = await stack.entry(entryUid).fetch();

// Query entries
const entries = await stack
  .entry()
  .query({ query: { title: 'My Entry' } })
  .find();

// Update entry
const updatedEntry = await stack.entry(entryUid).update({ ...entry });
```

### Error Handling for API Calls
```typescript
try {
  const stack = client.stack({ api_key: apiKey });
  const entry = await stack.entry(uid).fetch();
} catch (error: any) {
  if (error.status === 401) {
    throw new CLIError('Authentication failed. Please login again.');
  } else if (error.status === 404) {
    throw new CLIError(`Entry with UID "${uid}" not found.`);
  } else if (error.status === 429) {
    throw new CLIError('Rate limited. Please try again later.');
  }
  
  handleAndLogError(error, {
    module: 'entry-service',
    entryUid: uid,
    stackApiKey: apiKey
  });
}
```

## User Input and Interaction

### Interactive Prompts
```typescript
import { interactive } from '../../utils';

// Ask for region selection
const region = await interactive.askRegions();

// Ask for username
const username = await interactive.askUsername();

// Ask for password
const password = await interactive.askPassword();

// Ask custom question
const customResponse = await cliux.prompt('Enter your choice:');
```

### User Feedback
```typescript
// Success message
cliux.success('✅ Operation completed');

// Error message
cliux.error('❌ Operation failed');

// Info message
cliux.print('Processing...', { color: 'blue' });

// Show data
cliux.table([
  { name: 'Alice', region: 'us', status: 'active' },
  { name: 'Bob', region: 'eu', status: 'inactive' }
]);
```

## Logging Patterns

### Structured Logging
```typescript
log.debug('LoginCommand started', this.contextDetails);
log.debug('Management API client initialized', this.contextDetails);
log.debug('Token parsed', { 
  ...this.contextDetails, 
  flags: loginFlags 
});

try {
  await this.performOperation();
} catch (error) {
  log.debug('Operation failed', {
    ...this.contextDetails,
    error: error.message,
    errorCode: error.code
  });
}
```

### Context Details
The `BaseCommand` provides `contextDetails` with:
```typescript
contextDetails = {
  command: 'auth:login',
  userId: '12345',
  email: 'user@example.com',
  sessionId: 'session-123'
};
```

## Messages (i18n)

### Store User Strings
```json
// messages/en.json
{
  "auth": {
    "login": {
      "success": "Authentication successful",
      "failed": "Authentication failed"
    },
    "logout": {
      "success": "Logged out successfully"
    }
  },
  "config": {
    "region": {
      "set": "Region set to {{name}}"
    }
  }
}
```

### Use Message Handler
```typescript
import { messageHandler } from '@contentstack/cli-utilities';

const message = messageHandler.get(['auth', 'login', 'success']);
cliux.success(message);
```

## Best Practices

### Command Organization
```typescript
export default class MyCommand extends BaseCommand<typeof MyCommand> {
  // 1. Static properties
  static description = '...';
  static examples = [...];
  static flags = {...};
  
  // 2. Instance variables
  private someHelper: Helper;
  
  // 3. run method
  async run(): Promise<void> {
    try {
      const { flags } = await this.parse(MyCommand);
      await this.execute(flags);
    } catch (error) {
      handleAndLogError(error, this.contextDetails);
    }
  }
  
  // 4. Private helper methods
  private async execute(flags: any): Promise<void> {}
  private validate(input: any): void {}
}
```

### Error Messages
- Be specific about what went wrong
- Provide actionable feedback
- Example: "Region must be AWS-NA, AWS-EU, or AWS-AU"
- Not: "Invalid region"

### Progress Indication
```typescript
cliux.print('🔄 Processing...', { color: 'blue' });
// ... operation ...
cliux.success('✅ Completed successfully');
```
