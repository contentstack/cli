---
name: contentstack-cli
description: Contentstack CLI development patterns, OCLIF commands, API integration, and authentication/configuration workflows. Use when working with Contentstack CLI plugins, OCLIF commands, CLI commands, or Contentstack API integration.
---

# Contentstack CLI Development

## Quick Reference

For comprehensive patterns, see:
- **[Contentstack Patterns](./references/contentstack-patterns.md)** - Complete CLI commands, API integration, and configuration patterns
- **[Framework Patterns](../framework/references/framework-patterns.md)** - Utilities, configuration, and error handling

## Key Patterns Summary

### OCLIF Command Structure
- Extend `BaseCommand` (package-level) or `Command` from `@contentstack/cli-command`
- Validate flags early: `if (!flags.region) this.error('Region is required')`
- Delegate to services/utils: commands handle CLI, utilities handle logic
- Show progress: `cliux.success('✅ Operation completed')`
- Include command examples: `static examples = ['$ csdx auth:login', '$ csdx auth:login -u email@example.com']`

### Command Topics
- Auth commands: `auth:login`, `auth:logout`, `auth:whoami`, `auth:tokens:add`, `auth:tokens:remove`, `auth:tokens:index`
- Config commands: `config:get:region`, `config:set:region`, `config:remove:proxy`, etc.
- File pattern: `src/commands/auth/login.ts` → command `cm:auth:login`

### Flag Patterns
```typescript
static flags: FlagInput = {
  username: flags.string({
    char: 'u',
    description: 'Email address',
    required: false
  }),
  oauth: flags.boolean({
    description: 'Enable SSO',
    default: false,
    exclusive: ['username', 'password']
  })
};
```

### Logging and Error Handling
- Use structured logging: `log.debug('Message', { context: 'data' })`
- Include contextDetails: `handleAndLogError(error, { ...this.contextDetails, module: 'auth-login' })`
- User feedback: `cliux.success()`, `cliux.error()`, `throw new CLIError()`

### I18N Messages
- Store user-facing strings in `messages/*.json` files
- Load with `messageHandler` from utilities
- Example: `messages/en.json` for English strings

## Command Base Class Pattern

```typescript
export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected contextDetails!: Context;

  async init(): Promise<void> {
    await super.init();
    this.contextDetails = {
      command: this.context?.info?.command || 'unknown',
      userId: configHandler.get('userUid'),
      email: configHandler.get('email')
    };
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    return super.catch(err);
  }
}
```

## Authentication Patterns

### Login Command Example
```typescript
async run(): Promise<void> {
  const { flags: loginFlags } = await this.parse(LoginCommand);
  
  if (loginFlags.oauth) {
    await oauthHandler.oauth();
  } else {
    const username = loginFlags.username || await interactive.askUsername();
    const password = loginFlags.password || await interactive.askPassword();
    await authHandler.login(username, password);
  }
  
  cliux.success('✅ Authenticated successfully');
}
```

### Check Authentication
```typescript
if (!configHandler.get('authenticationMethod')) {
  throw new CLIError('Authentication required. Please login first.');
}
```

## Configuration Patterns

### Config Set/Get/Remove Commands
- Use `configHandler.get()` and `configHandler.set()`
- Support interactive mode when no flags provided
- Display results with `cliux.success()` or `cliux.print()`

### Region Configuration
```typescript
const selectedRegion = args.region || await interactive.askRegions();
const regionDetails = regionHandler.setRegion(selectedRegion);
cliux.success(`Region set to ${regionDetails.name}`);
cliux.success(`CMA host: ${regionDetails.cma}`);
```

## API Integration

### Management SDK Client
```typescript
import { managementSDKClient } from '@contentstack/cli-utilities';

const client = await managementSDKClient({ 
  host: this.cmaHost,
  skipTokenValidity: true 
});

const stack = client.stack({ api_key: stackApiKey });
const entries = await stack.entry().query().find();
```

### Error Handling for API Calls
```typescript
try {
  const result = await this.client.stack().entry().fetch();
} catch (error) {
  if (error.status === 401) {
    throw new CLIError('Authentication failed. Please login again.');
  } else if (error.status === 404) {
    throw new CLIError('Entry not found.');
  }
  handleAndLogError(error, { 
    module: 'entry-fetch',
    entryId: entryUid
  });
}
```

## Usage

Reference the comprehensive patterns guide above for detailed implementations, examples, and best practices for CLI command development, authentication flows, configuration management, and API integration.
