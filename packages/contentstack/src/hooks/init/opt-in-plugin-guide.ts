import { Hook } from '@oclif/core';
import { cliux } from '@contentstack/cli-utilities';

/**
 * Commands whose plugins used to ship bundled with the CLI but are now opt-in.
 * Keyed by oclif topic (the segment before the first `:` in a command id).
 */
const DEMOTED_PLUGINS: Record<string, string> = {
  launch: '@contentstack/cli-launch',
};

/**
 * When a user runs a command belonging to a demoted (now opt-in) plugin that
 * is not installed, warn them and point to the install command instead of
 * letting the generic "command not found" handler report it as a typo. Runs on
 * `init`, before command resolution, so it pre-empts `@oclif/plugin-not-found`.
 */
const hook: Hook<'init'> = async function (opts): Promise<void> {
  if (!opts.id) return;

  const topic = opts.id.split(':')[0];
  const pluginName = DEMOTED_PLUGINS[topic];
  if (!pluginName) return;

  // If the plugin is already installed, let normal command resolution proceed.
  if (this.config.plugins.has(pluginName)) return;

  cliux.print(
    `\nWarning: "${topic}" is now an opt-in plugin and is not installed, so "${topic}:*" commands are unavailable.`,
    { color: 'yellow' },
  );
  cliux.print('\nInstall it to enable these commands:', { color: 'yellow' });
  cliux.print(`  csdx plugins:install ${pluginName}\n`, { color: 'green' });

  this.exit(127);
};

export default hook;
