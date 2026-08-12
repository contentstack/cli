import { Hook } from '@oclif/core';
import { cliux } from '@contentstack/cli-utilities';

/**
 * Commands whose plugins used to ship bundled with the CLI but are now opt-in.
 *
 * `match` tests the full command id rather than just the oclif topic (the segment
 * before the first `:`) because not every demoted plugin owns its topic: launch's
 * commands all share the `launch` topic, but migrate-rte's only command is
 * `cm:entries:migrate-html-rte` — topic `cm`, which is also used by dozens of
 * unrelated commands (`cm:stacks:export`, etc.), so it can't be keyed by topic.
 */
const DEMOTED_PLUGINS: Array<{ match: (id: string) => boolean; label: string; pluginName: string }> = [
  { match: (id) => id.split(':')[0] === 'launch', label: 'launch', pluginName: '@contentstack/cli-launch' },
  {
    match: (id) => id === 'cm:entries:migrate-html-rte',
    label: 'cm:entries:migrate-html-rte',
    pluginName: '@contentstack/cli-cm-migrate-rte',
  },
];

/**
 * When a user runs a command belonging to a demoted (now opt-in) plugin that
 * is not installed, warn them and point to the install command instead of
 * letting the generic "command not found" handler report it as a typo. Runs on
 * `init`, before command resolution, so it pre-empts `@oclif/plugin-not-found`.
 */
const hook: Hook<'init'> = async function (opts): Promise<void> {
  if (!opts.id) return;

  const demoted = DEMOTED_PLUGINS.find(({ match }) => match(opts.id as string));
  if (!demoted) return;

  const { label, pluginName } = demoted;

  // If the plugin is already installed, let normal command resolution proceed.
  if (this.config.plugins.has(pluginName)) return;

  cliux.print(
    `\nWarning: "${label}" is now an opt-in plugin and is not installed, so this command is unavailable.`,
    { color: 'yellow' },
  );
  cliux.print('\nInstall it to enable this command:', { color: 'yellow' });
  cliux.print(`  csdx plugins:install ${pluginName}\n`, { color: 'green' });

  this.exit(127);
};

export default hook;
