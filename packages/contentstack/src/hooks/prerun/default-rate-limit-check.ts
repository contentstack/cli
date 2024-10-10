import { cliux, configHandler } from '@contentstack/cli-utilities';

export default function (): void {
  const rateLimit = configHandler.get('rateLimit');
  if (!rateLimit?.default) {
    const defaultPlan = {
      getLimit: { value: 10, utilize: 50 },
      limit: { value: 10, utilize: 50 },
      bulkLimit: { value: 1, utilize: 50 },
    };
    configHandler.set('rateLimit', { default: defaultPlan });
    cliux.print(
      `Default rate limit configuration is set to ${JSON.stringify(
        defaultPlan,
      )}. Please use this command csdx config:set:rate-limit to set the custom rate limit config.`,
      { color: 'blue' },
    );
  }
}
